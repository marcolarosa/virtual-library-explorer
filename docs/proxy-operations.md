# Proxy Service Operations

## Monitoring Costs

### CloudWatch Dashboard

Check Lambda duration and invocations in CloudWatch:

```
https://console.aws.amazon.com/cloudwatch/
```

Key metrics to monitor:
- **Invocations**: Total number of proxy requests
- **Duration**: Average request processing time (milliseconds)
- **Errors**: Number of failed requests
- **ConcurrentExecutions**: Peak concurrent Lambda invocations

### Billing Dashboard

Check costs in AWS Billing Console (updated daily):

```
https://console.aws.amazon.com/billing/home
```

Typical cost breakdown:
- **Lambda**: ~$0.20 per million requests + $0.0000166667 per GB-second
- **API Gateway**: ~$3.50 per million requests
- **CloudFront**: ~$0.085 per GB egress (varies by region)
- **NAT Gateway**: ~$32/month + data processing fees

## CloudWatch Alarms

Three alarms are configured to monitor the proxy service:

### 1. Error Rate Alarm
- **Name**: `library-explorer-proxy-errors`
- **Trigger**: Sum of errors >= 50 in a 5-minute period
- **Action**: SNS notification to operations team
- **Threshold Details**: Assumes ~1000 requests per 5 minutes; 50 errors = 5% error rate

### 2. Concurrency Alarm
- **Name**: `library-explorer-proxy-concurrency`
- **Trigger**: Maximum concurrent executions > 80 in a 60-second period
- **Action**: SNS notification to operations team
- **Lambda Reserved Concurrency**: Set to 100 to prevent throttling

### 3. Invocation Rate Alarm
- **Name**: `library-explorer-proxy-invocations`
- **Trigger**: Sum of invocations > 1000 in a 1-minute period
- **Action**: SNS notification to operations team
- **Purpose**: Cost control; detects usage spikes that may indicate DoS or unexpected traffic surge

## Alarm Thresholds & Adjustment

### Error Rate Alarm
The threshold of 50 errors assumes approximately 1000 requests within a 5-minute evaluation period, yielding a 5% error rate. To adjust this threshold:

1. **Estimate your baseline traffic**: Check CloudWatch Logs or dashboard for typical requests per 5 minutes
2. **Calculate new threshold**: `baseline_requests × 0.05` (for 5% error rate)
3. **Update threshold in `infra/lib/proxy-stack.ts`**: Change line 160 `threshold: 50` to your calculated value
4. **Redeploy**: `cd infra && npm run deploy`

Example: If you expect ~2000 requests per 5 minutes, set threshold to 100 to maintain 5% error rate.

### Invocation Rate Alarm
The 1000 invocations per minute threshold is set to catch unusual traffic spikes. Adjust based on expected baseline:

1. **Review CloudWatch dashboard** for typical peak invocation rates
2. **Set threshold at ~120% of peak**: This prevents alert fatigue while catching real anomalies
3. **Update threshold in `infra/lib/proxy-stack.ts`**: Change line 200 `threshold: 1000` to your value

### Concurrency Alarm
The 80 concurrent execution threshold is 80% of the reserved concurrency limit (100). To adjust:

1. **Change reserved concurrency**: Increase via Lambda console or `infra/lib/proxy-stack.ts` line 178
2. **Update alarm threshold**: Keep at 80% of your new reserved concurrency limit
3. **Redeploy**: `cd infra && npm run deploy`

## Setting Up Email Notifications (SNS)

To receive email notifications for alarms:

1. Go to AWS SNS console: https://console.aws.amazon.com/sns/
2. In the left sidebar, click **Topics**
3. Find the topic with name matching `LibraryExplorerProxyStack-ProxyAlarmTopic*` (use Ctrl+F to search)
4. Click on the topic name to open it
5. Click **Create subscription**
6. Select **Protocol**: Email
7. Enter your **Endpoint**: your-email@example.com
8. Click **Create subscription**
9. Check your email for a confirmation message from AWS SNS
10. Click the **Confirm subscription** link in the email

Once confirmed, you will receive email notifications immediately when any alarm triggers.

**Note**: If you don't see the confirmation email, check your spam folder or verify the email address is correct.

## Cost Control Strategy

### 1. Monitor Usage Patterns
- Track request volume trends
- Identify peak usage times
- Analyze which library APIs are most frequently queried

### 2. Implement Request Limits
If costs exceed acceptable threshold, implement rate limiting:

```javascript
// src/utils.js - Example rate limiting
const requestLog = new Map();

function isRateLimited(clientId, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!requestLog.has(clientId)) {
    requestLog.set(clientId, []);
  }
  
  const requests = requestLog.get(clientId)
    .filter(time => time > windowStart);
  
  if (requests.length >= limit) {
    return true;
  }
  
  requests.push(now);
  requestLog.set(clientId, requests);
  return false;
}
```

### 3. Scale Down or Shutdown

If costs exceed acceptable threshold and rate limiting doesn't help:

#### Step 1: Revert to Public Proxies
Update `src/utils.js` to remove the private proxy URL and fall back to public proxies:

```javascript
const PROXIES = [
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];
```

#### Step 2: Destroy the CloudFormation Stack
Stop all AWS charges by destroying the CDK stack:

```bash
cd infra
npm run destroy
```

#### Step 3: Verify Stack Deletion
Confirm the stack is deleted:

```bash
aws cloudformation describe-stacks --stack-name LibraryExplorerProxyStack
```

Expected error: `An error occurred (ValidationError) when calling the DescribeStacks operation: Stack with id LibraryExplorerProxyStack does not exist`

#### Step 4: Commit Changes
Commit the removal of the proxy service:

```bash
git add src/utils.js
git commit -m "chore: revert to public proxies, destroy AWS stack"
git push
```

## Environment Configuration

### SNS Topic for Alarms
The SNS topic `LibraryExplorerProxyStack-ProxyAlarmTopicC1815FD6-2jYe3jhzvNiy` receives all alarm notifications.

### Lambda Function Details
- **Function Name**: `LibraryExplorerProxyStack-ProxyFunction99E5E7D2-qRl20TSvOx1T`
- **Reserved Concurrency**: 100
- **Memory**: 512 MB
- **Timeout**: 30 seconds

## Runbook: Responding to Alarms

### If Error Rate Alarm Triggers
1. Check CloudWatch Logs for the Lambda function
2. Review error messages to identify pattern
3. Check external API status (library APIs may be down)
4. If persistent, check proxy handler code in `infra/lib/proxy-handler.js`
5. Deploy fix or revert to public proxies if needed

### If Concurrency Alarm Triggers
1. Spike in traffic detected
2. Check CloudWatch dashboard for request patterns
3. If sustained high traffic:
   - Increase Lambda reserved concurrency (max 1000)
   - Implement caching at CloudFront level
   - Implement request rate limiting in client
4. If temporary spike, no action needed

## Cost Optimization Tips

1. **Cache Responses**: CloudFront caching can reduce Lambda invocations by 40-60%
2. **Batch Requests**: Combine multiple library searches into one request where possible
3. **Use CloudFront**: Always route through CloudFront to benefit from caching
4. **Monitor Errors**: High error rates waste money; fix API issues quickly
5. **Set Concurrency Limits**: Prevents runaway costs from DoS or bugs
