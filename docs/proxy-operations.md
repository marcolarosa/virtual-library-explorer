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

Two alarms are configured to monitor the proxy service:

### 1. Error Rate Alarm
- **Name**: `library-explorer-proxy-errors`
- **Trigger**: Sum of errors >= 50 in a 5-minute period
- **Action**: SNS notification to operations team

### 2. Concurrency Alarm
- **Name**: `library-explorer-proxy-concurrency`
- **Trigger**: Maximum concurrent executions > 80 in a 60-second period
- **Action**: SNS notification to operations team
- **Lambda Reserved Concurrency**: Set to 100 to prevent throttling

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
