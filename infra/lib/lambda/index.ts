import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";

interface ProxyRequest {
    targetUrl: string;
    sourceIp: string;
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
function logRequest(
    event: ProxyRequest,
    statusCode: number,
    sizeByte: number,
    latencyMs: number,
    error: string | null,
): void {
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
export const handler = async (
    event: APIGatewayProxyEventV2,
    context: Context,
): Promise<APIGatewayProxyResultV2> => {
    const startTime = Date.now();
    const sourceIp = event.requestContext.http.sourceIp || "unknown";

    // Reject requests not coming through CloudFront
    if (event.headers["x-origin-verify"] !== "library-explorer-proxy") {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: "Forbidden" }),
            headers: { "Content-Type": "application/json" },
        };
    }

    // Parse the target URL from query parameter
    const targetUrl = event.queryStringParameters?.url;
    if (!targetUrl) {
        logRequest(
            { targetUrl: "", sourceIp },
            400,
            0,
            Date.now() - startTime,
            "Missing url parameter",
        );
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
            logRequest(
                { targetUrl, sourceIp },
                413,
                responseSize,
                latency,
                "Response exceeds size limit",
            );
            return {
                statusCode: 413,
                body: JSON.stringify({ error: "Response too large" }),
                headers: { "Content-Type": "application/json" },
            };
        }

        // Success
        const latency = Date.now() - startTime;
        logRequest({ targetUrl, sourceIp }, response.status, responseSize, latency, null);

        const headersToOmit = new Set([
            "content-encoding",
            "transfer-encoding",
            "content-length",
            "connection",
        ]);
        const forwardedHeaders = Object.fromEntries(
            Array.from(response.headers).filter(([key]) => !headersToOmit.has(key.toLowerCase())),
        );

        return {
            statusCode: response.status,
            body: responseBody,
            headers: {
                ...forwardedHeaders,
                "Content-Length": String(Buffer.byteLength(responseBody)),
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        };
    } catch (error: any) {
        const latency = Date.now() - startTime;
        const errorMessage =
            error?.name === "AbortError" ? "Request timeout" : error?.message || "Unknown error";
        logRequest({ targetUrl, sourceIp }, 504, 0, latency, errorMessage);

        return {
            statusCode: 504,
            body: JSON.stringify({ error: "Target API timeout or unreachable" }),
            headers: { "Content-Type": "application/json" },
        };
    }
};
