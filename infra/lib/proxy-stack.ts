import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { formatAllowedDomainsEnv } from "./whitelist";
import * as path from "path";

export interface ProxyStackProps extends cdk.StackProps {
    lambdaMemory?: number;
    lambdaTimeout?: number;
    cloudFrontTtl?: number;
    fetchTimeoutMs?: number;
    responseSizeLimitBytes?: number;

    alarmEmail?: string;
}

export class ProxyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: ProxyStackProps) {
        super(scope, id, props);

        const lambdaMemory = props?.lambdaMemory || 512;
        const lambdaTimeoutSec = props?.lambdaTimeout || 30;
        const cloudFrontTtlSec = props?.cloudFrontTtl || 21600; // 6 hours
        const fetchTimeoutMs = props?.fetchTimeoutMs || 10000;
        const responseSizeLimitBytes = props?.responseSizeLimitBytes || 10485760;

        // CloudWatch log group
        const logGroup = new logs.LogGroup(this, "ProxyLogs", {
            logGroupName: "/aws/lambda/library-explorer-proxy",
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Lambda function
        const lambdaFunction = new NodejsFunction(this, "ProxyFunction", {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "lambda/index.ts"),
            handler: "handler",
            memorySize: lambdaMemory,
            timeout: cdk.Duration.seconds(lambdaTimeoutSec),
            logGroup,
            environment: {
                ALLOWED_DOMAINS: formatAllowedDomainsEnv(),
                FETCH_TIMEOUT_MS: fetchTimeoutMs.toString(),
                RESPONSE_SIZE_LIMIT_BYTES: responseSizeLimitBytes.toString(),
            },

            bundling: {
                target: "node20",
                forceDockerBundling: false,
            },
        });

        // API Gateway HTTP API
        const api = new apigateway.HttpApi(this, "ProxyApi", {
            description: "CORS proxy for library APIs",
            corsPreflight: {
                allowMethods: [apigateway.CorsHttpMethod.GET, apigateway.CorsHttpMethod.HEAD],
                allowOrigins: ["*"],
                allowHeaders: ["Content-Type"],
            },
        });

        // Route: GET /proxy
        api.addRoutes({
            path: "/proxy",
            methods: [apigateway.HttpMethod.GET],
            integration: new apigatewayIntegrations.HttpLambdaIntegration("ProxyIntegration", lambdaFunction),
        });

        // CloudFront distribution
        const distribution = new cloudfront.Distribution(this, "ProxyDistribution", {
            defaultBehavior: {
                origin: new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split("/", api.url!)), {
                    customHeaders: {
                        "X-Origin-Verify": "library-explorer-proxy",
                    },
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: new cloudfront.CachePolicy(this, "ProxyCachePolicy", {
                    cachePolicyName: "library-explorer-proxy-cache",
                    defaultTtl: cdk.Duration.seconds(cloudFrontTtlSec),
                    maxTtl: cdk.Duration.seconds(cloudFrontTtlSec),
                    minTtl: cdk.Duration.seconds(0),
                    enableAcceptEncodingGzip: true,
                    enableAcceptEncodingBrotli: true,
                }),
                compress: true,
            },
        });

        // CloudWatch dashboard
        const dashboard = new cloudwatch.Dashboard(this, "ProxyDashboard", {
            dashboardName: "library-explorer-proxy",
        });

        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: "Lambda Invocations",
                left: [
                    lambdaFunction.metricInvocations({
                        statistic: "Sum",
                        period: cdk.Duration.minutes(5),
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: "Lambda Duration (p50, p95, p99)",
                left: [
                    lambdaFunction.metricDuration({
                        statistic: "p50",
                        period: cdk.Duration.minutes(5),
                    }),
                    lambdaFunction.metricDuration({
                        statistic: "p95",
                        period: cdk.Duration.minutes(5),
                    }),
                    lambdaFunction.metricDuration({
                        statistic: "p99",
                        period: cdk.Duration.minutes(5),
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: "Lambda Errors",
                left: [
                    lambdaFunction.metricErrors({
                        statistic: "Sum",
                        period: cdk.Duration.minutes(5),
                    }),
                ],
            })
        );

        // SNS topic for alarms
        const alarmTopic = new sns.Topic(this, "ProxyAlarmTopic", {
            displayName: "Library Explorer Proxy Alarms",
        });

        if (props?.alarmEmail) {
            alarmTopic.addSubscription(new subscriptions.EmailSubscription(props.alarmEmail));
        }

        // Alarm: Error rate > 5% in 5 minutes
        // Assumes ~1000 requests/5min; 50 errors = 5% error rate
        // Adjust threshold based on expected traffic volume. For higher traffic, increase threshold proportionally.
        // Example: For ~2000 requests/5min, set threshold to 100 (still 5%)
        new cloudwatch.Alarm(this, "ErrorRateAlarm", {
            metric: lambdaFunction.metricErrors({
                statistic: "Sum",
                period: cdk.Duration.minutes(5),
            }),
            threshold: 50,
            evaluationPeriods: 1,
            alarmDescription: "Lambda error rate exceeded 5%",
            alarmName: "library-explorer-proxy-errors",
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

        // Alarm: Concurrent executions approaching limit
        new cloudwatch.Alarm(this, "ConcurrencyAlarm", {
            metric: new cloudwatch.Metric({
                namespace: "AWS/Lambda",
                metricName: "ConcurrentExecutions",
                dimensionsMap: {
                    FunctionName: lambdaFunction.functionName,
                },
                statistic: "Maximum",
                period: cdk.Duration.minutes(1),
            }),
            threshold: 80,  // Alert at 80% of 100 reserved concurrent executions
            evaluationPeriods: 1,
            alarmDescription: "Lambda concurrency approaching limit (80/100)",
            alarmName: "library-explorer-proxy-concurrency",
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

        // Alarm: Invocation spike (cost control)
        new cloudwatch.Alarm(this, "InvocationRateAlarm", {
            metric: lambdaFunction.metricInvocations({
                statistic: "Sum",
                period: cdk.Duration.minutes(1),
            }),
            threshold: 1000,
            evaluationPeriods: 1,
            alarmDescription: "Lambda invocation spike detected (>1000 per minute)",
            alarmName: "library-explorer-proxy-invocations",
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

        // Outputs
        new cdk.CfnOutput(this, "ApiEndpoint", {
            value: api.url!,
            description: "API Gateway endpoint",
        });

        new cdk.CfnOutput(this, "CloudFrontUrl", {
            value: `https://${distribution.distributionDomainName}`,
            description: "CloudFront distribution URL (use this as proxy)",
        });

        new cdk.CfnOutput(this, "LambdaFunctionName", {
            value: lambdaFunction.functionName,
            description: "Lambda function name",
        });
    }
}
