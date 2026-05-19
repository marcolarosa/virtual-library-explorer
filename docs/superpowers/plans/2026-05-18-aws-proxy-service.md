# AWS Proxy Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## ⏳ PROGRESS SNAPSHOT (2026-05-18, Session 1)

**✅ COMPLETED TASKS:**
- Task 1: Initialize CDK Project (package.json, cdk.json, tsconfig.json, npm install) — Commit 0c27925
- Task 2: Extract Whitelist from sources.js (infra/lib/whitelist.ts) — Commit 457fd5d  
  - Extracted 6 domains: dp.la, find.slv.vic.gov.au, trove.nla.gov.au, www.europeana.eu, www.loc.gov, www.rijksmuseum.nl
- Task 3: Create Lambda Handler Function (infra/lib/lambda/index.ts) — Commit 72f3aad
- Task 4: Create CDK Stack (infra/lib/proxy-stack.ts, infra/bin/proxy.ts) — Commit 78cbf96
  - TypeScript compiles correctly; Docker needed for full bundling (expected in CI/CD)

**⏸️ PENDING TASKS (Resume from Task 5):**
- Task 5: Add Lambda Bundling (esbuild) — NOT STARTED
- Task 6: Update src/utils.js to Use the Proxy
- Task 7: Deploy the Stack to AWS
- Task 8: Test the Proxy End-to-End
- Task 9: Set Up CloudWatch Alarms for Cost Control

**NEXT STEPS:** Read this plan and dispatch subagent-driven-development to continue from Task 5.

---

**Goal:** Deploy a serverless CORS proxy service in AWS (Lambda + API Gateway + CloudFront) to replace public proxies and minimize costs through caching.

**Architecture:** Lambda function validates requests against a whitelist extracted from `sources.js`, fetches the target URL, and returns the response with CORS headers. CloudFront caches responses for 6 hours to reduce Lambda invocations. CloudWatch logs request metadata for cost visibility.

**Tech Stack:** AWS CDK (TypeScript), AWS Lambda (Node.js 20), API Gateway HTTP API, CloudFront, CloudWatch

---

## Task 1: Initialize CDK Project

**Files:**
- Create: `infra/package.json`
- Create: `infra/cdk.json`
- Create: `infra/tsconfig.json`

- [ ] **Step 1: Create infra directory and package.json**

```bash
mkdir -p infra
cat > infra/package.json << 'EOF'
{
  "name": "library-explorer-proxy",
  "version": "1.0.0",
  "description": "AWS CDK proxy service for library APIs",
  "main": "lib/proxy-stack.ts",
  "scripts": {
    "build": "tsc",
    "cdk": "cdk",
    "deploy": "cdk deploy --require-approval=never",
    "destroy": "cdk destroy --force",
    "synth": "cdk synth"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
```

- [ ] **Step 2: Create cdk.json**

```bash
cat > infra/cdk.json << 'EOF'
{
  "app": "npx ts-node bin/proxy.ts",
  "context": {
    "lambdaMemory": 512,
    "lambdaTimeout": 30,
    "cloudFrontTtl": 21600,
    "fetchTimeoutMs": 10000,
    "responseSizeLimitBytes": 10485760,
    "concurrencyLimit": 100
  }
}
EOF
```

- [ ] **Step 3: Create tsconfig.json**

```bash
cat > infra/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

- [ ] **Step 4: Install dependencies**

```bash
cd infra
npm install
```

Expected: `package-lock.json` created, node_modules populated.

- [ ] **Step 5: Commit**

```bash
git add infra/package.json infra/package-lock.json infra/cdk.json infra/tsconfig.json
git commit -m "chore: initialize CDK project structure"
```

---

## Task 2: Extract Whitelist from sources.js

**Files:**
- Create: `infra/lib/whitelist.ts`

- [ ] **Step 1: Read src/sources.js to identify URL pattern**

```bash
grep -n "url:" src/sources.js | head -20
```

Expected: Lines showing API URLs in the SOURCES object, e.g., `url: "https://api.trove.nla.gov.au/..."`.

- [ ] **Step 2: Create whitelist extraction utility**

```bash
cat > infra/lib/whitelist.ts << 'EOF'
import * as fs from "fs";
import * as path from "path";

/**
 * Extracts allowed domains from src/sources.js.
 * Parses the SOURCES object and collects unique domains from url fields.
 */
export function extractAllowedDomains(): string[] {
    const sourcesPath = path.join(__dirname, "../../src/sources.js");
    const sourcesContent = fs.readFileSync(sourcesPath, "utf-8");

    // Simple regex to find url: "https://..." patterns in sources.js
    const urlPattern = /url:\s*["']([^"']+)["']/g;
    const domains = new Set<string>();

    let match;
    while ((match = urlPattern.exec(sourcesContent)) !== null) {
        try {
            const url = match[1];
            const domain = new URL(url).hostname;
            if (domain) {
                domains.add(domain);
            }
        } catch (e) {
            console.warn(`Failed to parse URL: ${match[1]}`);
        }
    }

    return Array.from(domains).sort();
}

/**
 * Formats allowed domains as a comma-separated string for Lambda env var.
 */
export function formatAllowedDomainsEnv(): string {
    const domains = extractAllowedDomains();
    if (domains.length === 0) {
        throw new Error("No domains found in src/sources.js. Check URL patterns.");
    }
    return domains.join(",");
}
EOF
```

- [ ] **Step 3: Test the whitelist extraction**

```bash
cd infra
npx ts-node lib/whitelist.ts
```

Expected: List of domains printed to console (e.g., `api.trove.nla.gov.au`, `api.europeana.eu`, etc.).

Add this line to `whitelist.ts` at the end for testing:

```typescript
if (require.main === module) {
    console.log("Allowed domains:", extractAllowedDomains());
}
```

Then run: `npx ts-node lib/whitelist.ts`

- [ ] **Step 4: Commit**

```bash
git add infra/lib/whitelist.ts
git commit -m "feat: add whitelist extraction from sources.js"
```

---

## Task 3: Create Lambda Handler Function

**Files:**
- Create: `infra/lib/lambda/index.ts`

- [ ] **Step 1: Create lambda directory**

```bash
mkdir -p infra/lib/lambda
```

- [ ] **Step 2: Write Lambda handler**

```bash
cat > infra/lib/lambda/index.ts << 'EOF'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";

interface ProxyRequest {
    targetUrl: string;
    sourceIp: string;
}

interface ProxyResponse {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
}

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "").split(",").filter(Boolean);
const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || "10000", 10);
const RESPONSE_SIZE_LIMIT_BYTES = parseInt(process.env.RESPONSE_SIZE_LIMIT_BYTES || "10485760", 10);

/**
 * Validates that the target URL domain is in the whitelist.
 */
function isDomainAllowed(url: string): boolean {
    try {
        const targetDomain = new URL(url).hostname;
        return ALLOWED_DOMAINS.includes(targetDomain);
    } catch (e) {
        return false;
    }
}

/**
 * Logs a request to CloudWatch in JSON format.
 */
function logRequest(event: ProxyRequest, statusCode: number, sizeByte: number, latencyMs: number, error: string | null): void {
    const logEntry = {
        timestamp: new Date().toISOString(),
        sourceIp: event.sourceIp,
        targetUrl: event.targetUrl,
        statusCode,
        responseSizeBytes: sizeByte,
        latencyMs,
        cached: false,
        error,
    };
    console.log(JSON.stringify(logEntry));
}

/**
 * Lambda handler for the proxy service.
 */
export const handler = async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> => {
    const startTime = Date.now();
    const sourceIp = event.requestContext.http.sourceIp || "unknown";

    // Parse the target URL from query parameter
    const targetUrl = event.queryStringParameters?.url;
    if (!targetUrl) {
        logRequest({ targetUrl: "", sourceIp }, 400, 0, Date.now() - startTime, "Missing url parameter");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing or invalid 'url' query parameter" }),
            headers: { "Content-Type": "application/json" },
        };
    }

    try {
        // Validate the domain
        if (!isDomainAllowed(targetUrl)) {
            const latency = Date.now() - startTime;
            logRequest({ targetUrl, sourceIp }, 403, 0, latency, "Domain not whitelisted");
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Domain not whitelisted" }),
                headers: { "Content-Type": "application/json" },
            };
        }

        // Fetch the target URL
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), FETCH_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(targetUrl, {
                signal: fetchController.signal,
                headers: {
                    "User-Agent": "Library-Explorer-Proxy/1.0",
                },
            });
        } finally {
            clearTimeout(fetchTimeout);
        }

        // Read the response body
        const responseBody = await response.text();
        const responseSize = Buffer.byteLength(responseBody);

        // Check size limit
        if (responseSize > RESPONSE_SIZE_LIMIT_BYTES) {
            const latency = Date.now() - startTime;
            logRequest({ targetUrl, sourceIp }, 413, responseSize, latency, "Response exceeds size limit");
            return {
                statusCode: 413,
                body: JSON.stringify({ error: "Response too large" }),
                headers: { "Content-Type": "application/json" },
            };
        }

        // Success
        const latency = Date.now() - startTime;
        logRequest({ targetUrl, sourceIp }, response.status, responseSize, latency, null);

        return {
            statusCode: response.status,
            body: responseBody,
            headers: {
                ...Object.fromEntries(response.headers),
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        };
    } catch (error: any) {
        const latency = Date.now() - startTime;
        const errorMessage = error?.name === "AbortError" ? "Request timeout" : error?.message || "Unknown error";
        logRequest({ targetUrl, sourceIp }, 504, 0, latency, errorMessage);

        return {
            statusCode: 504,
            body: JSON.stringify({ error: "Target API timeout or unreachable" }),
            headers: { "Content-Type": "application/json" },
        };
    }
};
EOF
```

- [ ] **Step 3: Commit**

```bash
git add infra/lib/lambda/index.ts
git commit -m "feat: add Lambda proxy handler with validation and logging"
```

---

## Task 4: Create CDK Stack (API Gateway + Lambda)

**Files:**
- Create: `infra/lib/proxy-stack.ts`
- Create: `infra/bin/proxy.ts`

- [ ] **Step 1: Create proxy-stack.ts with Lambda and API Gateway**

```bash
cat > infra/lib/proxy-stack.ts << 'EOF'
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { formatAllowedDomainsEnv } from "./whitelist";
import * as fs from "fs";
import * as path from "path";

export interface ProxyStackProps extends cdk.StackProps {
    lambdaMemory?: number;
    lambdaTimeout?: number;
    cloudFrontTtl?: number;
    fetchTimeoutMs?: number;
    responseSizeLimitBytes?: number;
    concurrencyLimit?: number;
}

export class ProxyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: ProxyStackProps) {
        super(scope, id, props);

        const lambdaMemory = props?.lambdaMemory || 512;
        const lambdaTimeoutSec = props?.lambdaTimeout || 30;
        const cloudFrontTtlSec = props?.cloudFrontTtl || 21600; // 6 hours
        const fetchTimeoutMs = props?.fetchTimeoutMs || 10000;
        const responseSizeLimitBytes = props?.responseSizeLimitBytes || 10485760;
        const concurrencyLimit = props?.concurrencyLimit || 100;

        // CloudWatch log group
        const logGroup = new logs.LogGroup(this, "ProxyLogs", {
            logGroupName: "/aws/lambda/library-explorer-proxy",
            retention: logs.RetentionDays.ONE_MONTH,
        });

        // Lambda function
        const lambdaFunction = new lambda.Function(this, "ProxyFunction", {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "lambda"), {
                bundling: {
                    image: lambda.Runtime.NODEJS_20_X.bundlingImage,
                    command: [
                        "bash",
                        "-c",
                        "npx esbuild index.ts --bundle --platform=node --target=node20 --outfile=/asset-output/index.js",
                    ],
                },
            }),
            memorySize: lambdaMemory,
            timeout: cdk.Duration.seconds(lambdaTimeoutSec),
            logGroup,
            environment: {
                ALLOWED_DOMAINS: formatAllowedDomainsEnv(),
                FETCH_TIMEOUT_MS: fetchTimeoutMs.toString(),
                RESPONSE_SIZE_LIMIT_BYTES: responseSizeLimitBytes.toString(),
            },
            reservedConcurrentExecutions: concurrencyLimit,
        });

        // API Gateway HTTP API
        const api = new apigateway.HttpApi(this, "ProxyApi", {
            description: "CORS proxy for library APIs",
            corsPreflight: {
                allowMethods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.HEAD],
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
                        statistic: "Average",
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

        // Alarm: Error rate > 5% in 5 minutes
        new cloudwatch.Alarm(this, "ErrorRateAlarm", {
            metric: lambdaFunction.metricErrors({
                statistic: "Sum",
                period: cdk.Duration.minutes(5),
            }),
            threshold: 50, // Rough estimate; adjust based on traffic
            evaluationPeriods: 1,
            alarmDescription: "Lambda error rate exceeded 5%",
            alarmName: "library-explorer-proxy-errors",
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cloudwatch.SnsAction(alarmTopic));

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
EOF
```

- [ ] **Step 2: Create bin/proxy.ts entry point**

```bash
mkdir -p infra/bin
cat > infra/bin/proxy.ts << 'EOF'
#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ProxyStack } from "../lib/proxy-stack";

const app = new cdk.App();

new ProxyStack(app, "LibraryExplorerProxyStack", {
    env: {
        region: process.env.AWS_REGION || "us-east-1",
    },
});

app.synth();
EOF
chmod +x infra/bin/proxy.ts
```

- [ ] **Step 3: Synthesize the stack to verify it builds**

```bash
cd infra
npm run synth
```

Expected: CloudFormation template output (JSON). No errors.

- [ ] **Step 4: Commit**

```bash
git add infra/lib/proxy-stack.ts infra/bin/proxy.ts
git commit -m "feat: add CDK stack with Lambda, API Gateway, CloudFront"
```

---

## Task 5: Add Lambda Bundling (esbuild)

**Files:**
- Modify: `infra/package.json`

- [ ] **Step 1: Add esbuild as dev dependency**

```bash
cd infra
npm install --save-dev esbuild
```

Expected: `esbuild` added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Update package.json to include esbuild in scripts**

Open `infra/package.json` and verify `esbuild` is in devDependencies (it should be after the install).

- [ ] **Step 3: Test bundling by synthesizing again**

```bash
cd infra
npm run synth
```

Expected: CloudFormation template generated without errors. Check that Lambda code is bundled.

- [ ] **Step 4: Commit**

```bash
git add infra/package-lock.json
git commit -m "chore: add esbuild for Lambda bundling"
```

---

## Task 6: Update src/utils.js to Use the Proxy

**Files:**
- Modify: `src/utils.js:30-33`

- [ ] **Step 1: Get CloudFront URL from deployed stack (manual step after deployment)**

After running `cdk deploy`, the output will include the CloudFront URL. Example: `https://d123abc.cloudfront.net`

For now, we'll use a placeholder. Replace it after deployment.

- [ ] **Step 2: Update PROXIES array in src/utils.js**

Open `src/utils.js` and find the `PROXIES` constant (lines 30–33). Replace it with:

```javascript
const PROXIES = [
    (url) => `https://d123abc.cloudfront.net/proxy?url=${encodeURIComponent(url)}`,
    // Fallback to public proxy if deployment fails
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];
```

After deployment, replace `d123abc.cloudfront.net` with the actual CloudFront domain from the CDK output.

- [ ] **Step 3: Verify the change**

```bash
grep -A 2 "const PROXIES" src/utils.js
```

Expected: Shows the updated PROXIES array with the CloudFront URL.

- [ ] **Step 4: Commit**

```bash
git add src/utils.js
git commit -m "feat: update proxy to use AWS CloudFront distribution"
```

---

## Task 7: Deploy the Stack to AWS

**Files:**
- None (deployment step)

- [ ] **Step 1: Ensure AWS credentials are configured**

```bash
aws sts get-caller-identity
```

Expected: Outputs AWS account ID, user ARN, etc. If this fails, configure AWS credentials first.

- [ ] **Step 2: Deploy the CDK stack**

```bash
cd infra
npm run deploy
```

Expected: CloudFormation deployment begins. Takes 3–5 minutes. Outputs the CloudFront URL, API Gateway endpoint, and Lambda function name.

- [ ] **Step 3: Copy the CloudFront URL from output**

The output will look like:

```
LibraryExplorerProxyStack.CloudFrontUrl = https://d123abc.cloudfront.net
LibraryExplorerProxyStack.ApiEndpoint = https://abc123.execute-api.us-east-1.amazonaws.com
LibraryExplorerProxyStack.LambdaFunctionName = LibraryExplorerProxyStack-ProxyFunctionABC123-XYZ
```

- [ ] **Step 4: Update src/utils.js with the actual CloudFront URL**

Open `src/utils.js` and replace the placeholder `d123abc.cloudfront.net` with the actual URL from the CDK output.

```javascript
const PROXIES = [
    (url) => `https://d123abc.cloudfront.net/proxy?url=${encodeURIComponent(url)}`,
    // Keep fallback to public proxy
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];
```

- [ ] **Step 5: Commit the updated URL**

```bash
git add src/utils.js
git commit -m "chore: update proxy URL with deployed CloudFront distribution"
```

---

## Task 8: Test the Proxy End-to-End

**Files:**
- None (manual testing)

- [ ] **Step 1: Test basic proxy request with curl**

```bash
PROXY_URL="https://d123abc.cloudfront.net"
curl -v "$PROXY_URL/proxy?url=https%3A%2F%2Fapi.trove.nla.gov.au%2Fv2%2Fsearch%3Fq%3Dtest"
```

Expected: HTTP 200 response with JSON data from Trove API. Check headers include `Access-Control-Allow-Origin: *`.

- [ ] **Step 2: Test invalid domain (should 403)**

```bash
PROXY_URL="https://d123abc.cloudfront.net"
curl -v "$PROXY_URL/proxy?url=https%3A%2F%2Fevil.com%2Fdata"
```

Expected: HTTP 403 with message `{"error":"Domain not whitelisted"}`.

- [ ] **Step 3: Test cache behavior**

Make two identical requests 10 seconds apart:

```bash
PROXY_URL="https://d123abc.cloudfront.net"
curl -i "$PROXY_URL/proxy?url=https%3A%2F%2Fapi.trove.nla.gov.au%2Fv2%2Fsearch%3Fq%3Dbooks"
sleep 10
curl -i "$PROXY_URL/proxy?url=https%3A%2F%2Fapi.trove.nla.gov.au%2Fv2%2Fsearch%3Fq%3Dbooks"
```

Expected: First request has `X-Cache: Miss from cloudfront`, second has `X-Cache: Hit from cloudfront`.

- [ ] **Step 4: Check CloudWatch logs**

```bash
aws logs tail /aws/lambda/library-explorer-proxy --follow
```

Expected: JSON logs appear as requests are made. Each log contains timestamp, sourceIp, targetUrl, statusCode, responseSizeBytes, latencyMs.

- [ ] **Step 5: Test in the browser app**

Start the app locally:

```bash
npm run dev
```

Open a search and execute a query (e.g., search in Trove). The search should work and pull results through the new proxy. Check browser DevTools Network tab to verify requests go to the CloudFront distribution.

- [ ] **Step 6: Commit test notes (optional)**

```bash
git add -A
git commit -m "test: verify proxy deployment and caching behavior"
```

---

## Task 9: Set Up CloudWatch Alarms for Cost Control

**Files:**
- None (already in CDK stack from Task 4)

- [ ] **Step 1: Verify alarms were created**

```bash
aws cloudwatch describe-alarms --alarm-names library-explorer-proxy-errors
```

Expected: Alarm details returned, including state (OK, ALARM, or INSUFFICIENT_DATA).

- [ ] **Step 2: Create additional alarm for Lambda concurrency**

Run this AWS CLI command to add an alarm for concurrency approaching the limit:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name library-explorer-proxy-concurrency \
  --alarm-description "Lambda concurrency exceeding 80" \
  --metric-name ConcurrentExecutions \
  --namespace AWS/Lambda \
  --statistic Maximum \
  --period 60 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=LibraryExplorerProxyStack-ProxyFunctionABC123-XYZ
```

(Replace function name with output from Task 7 Step 3.)

- [ ] **Step 3: Verify SNS topic exists for alarm notifications**

```bash
aws sns list-topics
```

Expected: SNS topic `library-explorer-proxy-alarms` listed. Subscribe to it to receive email notifications (optional for this deploy).

- [ ] **Step 4: Document cost control steps**

Create a file `docs/proxy-operations.md`:

```bash
cat > docs/proxy-operations.md << 'EOF'
# Proxy Service Operations

## Monitoring Costs

1. Check Lambda duration and invocations in CloudWatch dashboard:
   ```
   https://console.aws.amazon.com/cloudwatch/
   ```

2. Check costs in AWS Billing dashboard (updated daily):
   ```
   https://console.aws.amazon.com/billing/home
   ```

## Scaling Down / Shutdown

If costs exceed acceptable threshold:

1. Update `src/utils.js` to remove the new proxy URL (fallback to public proxies):
   ```javascript
   const PROXIES = [
       (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
   ];
   ```

2. Destroy the CloudFormation stack:
   ```bash
   cd infra
   npm run destroy
   ```

3. Verify stack deleted:
   ```bash
   aws cloudformation describe-stacks --stack-name LibraryExplorerProxyStack
   ```

4. Commit changes:
   ```bash
   git add src/utils.js
   git commit -m "chore: revert to public proxies, destroy AWS stack"
   ```
EOF
```

- [ ] **Step 5: Commit**

```bash
git add docs/proxy-operations.md
git commit -m "docs: add proxy operations guide for cost monitoring"
```

---

## Summary

**Files Created:**
- `infra/package.json`, `infra/cdk.json`, `infra/tsconfig.json`
- `infra/lib/whitelist.ts`
- `infra/lib/lambda/index.ts`
- `infra/lib/proxy-stack.ts`
- `infra/bin/proxy.ts`
- `docs/proxy-operations.md`

**Files Modified:**
- `src/utils.js` (PROXIES array updated with CloudFront URL)

**Key Implementation Details:**
- Lambda validates all URLs against whitelist from `sources.js`
- CloudFront caches for 6 hours (configurable via `cdk.json`)
- Request-level logging to CloudWatch (JSON format)
- CloudWatch alarms for error rate and concurrency
- Cost-optimized: scales to zero, pays only for Lambda + data transfer

**Deployment:**
- `cdk deploy` creates all AWS resources (Lambda, API Gateway, CloudFront, logs, alarms)
- Takes ~3–5 minutes
- Outputs CloudFront URL for use in browser app
- Can destroy entirely with `cdk destroy`

