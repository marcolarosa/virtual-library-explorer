# AWS Proxy Service Specification

**Date:** 2026-05-18  
**Status:** Approved for implementation  
**Goal:** Deploy a cost-optimized CORS proxy service in AWS to replace public proxies (corsproxy.io, allorigins.win) with a self-hosted alternative.

## Overview

Replace the browser-based SPA's reliance on public CORS proxies with a dedicated AWS proxy service. The service will:
- Forward HTTP requests to whitelisted library APIs
- Cache responses for 6 hours to minimize Lambda invocations
- Log requests for cost visibility and abuse detection
- Validate requests against a whitelist derived from `sources.js`
- Scale from zero (no cost) to high volume without manual intervention

## Architecture

```
Browser (SPA)
    ↓ GET /proxy?url=<encoded-url>
CloudFront (6-hour cache, gzip compression)
    ↓ cache miss
API Gateway HTTP API
    ↓
Lambda Function (node 20, 512 MB, 30s timeout, 100 concurrent)
    ↓
External Library APIs
    ↓
CloudFront (cache & return)
    ↓
Browser
```

### Components

**CloudFront Distribution**
- Origin: API Gateway HTTP API endpoint
- Cache TTL: 6 hours (library APIs change infrequently)
- Caches: GET, HEAD requests only
- Query string forwarding: enabled (so `?url=X` and `?url=Y` cache separately)
- Compression: enabled (gzip, brotli)
- Custom origin header: identifies legitimate CloudFront requests to Lambda

**API Gateway HTTP API**
- Single route: `GET /proxy`
- Query parameter: `url` (URL-encoded target URL)
- Integration: Lambda function
- CORS: handled by Lambda (not API Gateway)

**Lambda Function**
- Runtime: Node.js 20.x
- Memory: 512 MB (I/O bound, not CPU intensive)
- Timeout: 30 seconds
- Concurrency limit: 100 (prevents runaway cost on traffic spikes)
- Environment variables:
  - `ALLOWED_DOMAINS`: comma-separated list of whitelisted domains (extracted from `sources.js` at deploy time)
  - `FETCH_TIMEOUT_MS`: 10000 (10 seconds for outbound requests)
  - `RESPONSE_SIZE_LIMIT_BYTES`: 10485760 (10 MB)

**CloudWatch Logs**
- Log group: `/aws/lambda/library-explorer-proxy`
- Retention: 30 days
- Per-request JSON log with timestamp, source IP, target URL, status, size, latency

## Request Flow

1. **Browser** sends GET request to `https://proxy.example.com/proxy?url=https://api.trove.nla.gov.au/v2/search?q=books`
2. **CloudFront** checks cache:
   - Cache hit: return cached response immediately (6-hour TTL)
   - Cache miss: forward to API Gateway
3. **API Gateway** routes to Lambda
4. **Lambda**:
   - Extracts `url` query parameter and URL-decodes it
   - Validates the target URL domain against `ALLOWED_DOMAINS`
   - If invalid: return 403 Forbidden
   - If valid: fetches the target URL with 10-second timeout
   - Logs the request to CloudWatch (source IP, URL, status, size, latency)
   - Returns the response with CORS headers and original content-type
5. **CloudFront** caches the response (6 hours) and returns to browser
6. **Browser** reads the response (CORS headers allow it)

## Request/Response Format

### Request
```
GET https://proxy.example.com/proxy?url=<url-encoded-target>

Example:
GET /proxy?url=https%3A%2F%2Fapi.trove.nla.gov.au%2Fv2%2Fsearch%3Fq%3Dbooks
```

### Success Response (200)
```
HTTP/1.1 200 OK
Content-Type: <from-target>
Content-Encoding: <if compressed>
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Content-Type
X-Cache: Hit from cloudfront | Miss from cloudfront

<target response body>
```

### Error Responses

**400 Bad Request** — Missing or unparseable URL parameter
```json
{
  "error": "Missing or invalid 'url' query parameter"
}
```

**403 Forbidden** — URL domain not in whitelist
```json
{
  "error": "Domain not whitelisted"
}
```

**504 Gateway Timeout** — Target API timeout or network error
```json
{
  "error": "Target API timeout or unreachable"
}
```

**5xx** — Target API error; pass through the actual status code

## Security

### URL Whitelisting
- Whitelist is configured via Lambda environment variable `ALLOWED_DOMAINS`
- Domains are extracted from `sources.js` during CDK deployment
- Only domains in the whitelist are proxied; all others return 403
- Update whitelist by updating `sources.js` and redeploying the CDK stack

### CORS Headers
- All responses include `Access-Control-Allow-Origin: *` (safe because URL validation is server-side)
- Methods limited to GET, HEAD
- Protects against browsers fetching arbitrary URLs

### No Authentication
- Proxy is open to the internet; anyone can use it
- Cost control is via:
  - Lambda concurrency limit (100 concurrent executions)
  - CloudFront caching (reduces Lambda invocations)
  - CloudWatch alarms on error rate and invocation count

## Logging

### CloudWatch Log Format
Each request produces one JSON log entry:
```json
{
  "timestamp": "2026-05-18T14:30:45.123Z",
  "sourceIp": "203.0.113.45",
  "targetUrl": "https://api.trove.nla.gov.au/v2/search?q=books",
  "statusCode": 200,
  "responseSizeBytes": 4521,
  "latencyMs": 342,
  "cached": false,
  "error": null
}
```

### Log Retention
- Retention: 30 days
- Cost: ~$0.03/GB/month (negligible at normal traffic)

### Monitoring
- **CloudWatch Dashboard:** Invocation count, error rate, p95 latency, cache hit ratio
- **Alarms:** 
  - Error rate >5% in 5 minutes → SNS notification
  - Invocation count >1000/minute → SNS notification (potential spike)

## Cost Estimates

Assumptions:
- Lambda price: $0.0000002 per invocation, $0.0000166667 per GB-second
- CloudFront price: $0.085/GB data transfer out, $0.01/10k requests
- CloudWatch: $0.50/GB/month logs

| Traffic Level | Requests/Day | Cache Hit % | Monthly Cost |
|---|---|---|---|
| Light | 100 | 70% | ~$0.50 |
| Moderate | 1,000 | 60% | ~$3–5 |
| Heavy | 10,000 | 50% | ~$20–30 |

**Cost drivers:**
- Lambda: dominant at low traffic (~60% of cost)
- CloudFront data transfer: dominant at high traffic
- Logging: negligible

**Cost control levers:**
1. Lambda concurrency limit (100) — caps worst-case runaway
2. CloudFront TTL (6 hours) — caching reduces Lambda invocations
3. CloudWatch alarms — alerts if traffic spikes unexpectedly
4. Kill switch: can delete the stack if costs spike (CloudFront cached data transferred, then cost stops)

## Deployment

### Prerequisites
- AWS account with credentials configured
- Node.js 18+ installed
- CDK CLI installed (`npm install -g aws-cdk`)

### Stack Files
```
infra/
  lib/
    proxy-stack.ts          — CDK stack definition
  bin/
    proxy.ts                — Entry point
  package.json              — Dependencies
  cdk.json                  — CDK config
```

### Deploy
```bash
cd infra
npm install
cdk deploy
```

Outputs:
- CloudFront distribution URL: `https://d123abc.cloudfront.net`
- API Gateway URL: `https://abc123.execute-api.us-east-1.amazonaws.com`
- Lambda function name: `library-explorer-proxy`

### Updating Whitelist
1. Update `sources.js` with new API domains
2. Redeploy CDK stack:
   ```bash
   cdk deploy
   ```
3. New domains available ~1 minute after stack update

## Testing

### Manual Testing
```bash
# Test basic request
curl "https://proxy.example.com/proxy?url=https%3A%2F%2Fapi.trove.nla.gov.au%2Fv2%2Fsearch%3Fq%3Dtest"

# Test invalid domain (should 403)
curl "https://proxy.example.com/proxy?url=https%3A%2F%2Fevil.com%2Fdata"

# Check cache headers
curl -i "https://proxy.example.com/proxy?url=https%3A%2F%2Fapi.trove.nla.gov.au%2Fv2%2Fsearch%3Fq%3Dtest"
# Response should include X-Cache: Hit from cloudfront (on second request)
```

### Integration Testing
Update `src/utils.js` to point to the proxy URL instead of public proxies:
```javascript
const PROXIES = [
    (url) => `https://proxy.example.com/proxy?url=${encodeURIComponent(url)}`,
];
```

Run existing search tests; behavior should be identical.

## Monitoring & Alerts

### CloudWatch Dashboard
Create a custom dashboard with:
- Lambda invocation count (5-min granularity)
- Lambda error count
- Lambda duration (p50, p95, p99)
- CloudFront cache hit ratio
- CloudFront requests
- CloudFront data transfer out

### Alarms
1. **Error rate >5% in 5 minutes** → SNS email notification
2. **Invocation count >1000/minute** → SNS notification (unexpected spike)
3. **Lambda concurrent execution >80** → SNS notification (approaching limit)

## Rollback

If issues arise:
1. **Immediate:** Update `src/utils.js` to fallback to public proxies
2. **Permanent:** `cdk destroy` removes all AWS resources

## Future Enhancements (Out of Scope)

- Regional failover (currently single region)
- Per-source rate limiting (currently global)
- Custom domain name (currently CloudFront default domain)
- Request authentication (API key, IP whitelist)
- Response filtering/transformation (currently pass-through)

## Success Criteria

- ✅ Proxy forwards requests to whitelisted library APIs
- ✅ Responses cached for 6 hours
- ✅ Request-level logging in CloudWatch
- ✅ Cost scales with traffic (not fixed)
- ✅ Error rate <1% under normal load
- ✅ p95 latency <500ms (including CloudFront cache hit)
- ✅ Whitelist updatable by redeploy (no hardcoding)
