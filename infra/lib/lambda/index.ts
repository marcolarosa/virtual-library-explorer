import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ALLOWED_DOMAINS } from "./allowed-domains";

const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || "10000", 10);
const RESPONSE_SIZE_LIMIT_BYTES = parseInt(process.env.RESPONSE_SIZE_LIMIT_BYTES || "10485760", 10);

const HEADERS_TO_OMIT = new Set([
    "content-encoding",
    "transfer-encoding",
    "content-length",
    "connection",
]);

function isDomainAllowed(url: string): boolean {
    try {
        return ALLOWED_DOMAINS.includes(new URL(url).hostname);
    } catch {
        return false;
    }
}

function logRequest(
    sourceIp: string,
    targetUrl: string,
    statusCode: number,
    responseSize: number,
    latencyMs: number,
    error: string | null = null,
): void {
    console.log(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            sourceIp,
            targetUrl,
            statusCode,
            responseSizeBytes: responseSize,
            latencyMs,
            error,
        }),
    );
}

function errorResponse(statusCode: number, message: string): APIGatewayProxyResultV2 {
    return {
        statusCode,
        body: JSON.stringify({ error: message }),
        headers: { "Content-Type": "application/json" },
    };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const startTime = Date.now();
    const sourceIp = event.requestContext.http.sourceIp || "unknown";
    const latency = () => Date.now() - startTime;

    // Verify CloudFront origin
    const hasValidOrigin = Object.entries(event.headers).some(
        ([key, value]) =>
            key.toLowerCase() === "x-origin-verify" && value === "library-explorer-proxy",
    );
    if (!hasValidOrigin) {
        return errorResponse(403, "Forbidden");
    }

    const targetUrl = event.queryStringParameters?.url;
    if (!targetUrl) {
        logRequest(sourceIp, "", 400, 0, latency(), "Missing url parameter");
        return errorResponse(400, "Missing or invalid 'url' query parameter");
    }

    if (!isDomainAllowed(targetUrl)) {
        logRequest(sourceIp, targetUrl, 403, 0, latency(), "Domain not whitelisted");
        return errorResponse(403, "Domain not whitelisted");
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: { "User-Agent": "Library-Explorer-Proxy/1.0" },
            });
        } finally {
            clearTimeout(timeout);
        }

        const responseBody = await response.text();
        const responseSize = Buffer.byteLength(responseBody);

        if (responseSize > RESPONSE_SIZE_LIMIT_BYTES) {
            logRequest(
                sourceIp,
                targetUrl,
                413,
                responseSize,
                latency(),
                "Response exceeds size limit",
            );
            return errorResponse(413, "Response too large");
        }

        logRequest(sourceIp, targetUrl, response.status, responseSize, latency());

        const forwardedHeaders = Object.fromEntries(
            Array.from(response.headers).filter(([key]) => !HEADERS_TO_OMIT.has(key.toLowerCase())),
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
        const message =
            error?.name === "AbortError" ? "Request timeout" : error?.message || "Unknown error";
        logRequest(sourceIp, targetUrl, 504, 0, latency(), message);
        return errorResponse(504, "Target API timeout or unreachable");
    }
};
