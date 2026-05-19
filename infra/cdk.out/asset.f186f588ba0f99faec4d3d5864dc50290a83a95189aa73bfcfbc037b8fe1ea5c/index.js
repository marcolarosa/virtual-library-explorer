"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/lambda/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "").split(",").filter(Boolean);
var FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || "10000", 10);
var RESPONSE_SIZE_LIMIT_BYTES = parseInt(process.env.RESPONSE_SIZE_LIMIT_BYTES || "10485760", 10);
function isDomainAllowed(url) {
  try {
    const targetDomain = new URL(url).hostname;
    return ALLOWED_DOMAINS.includes(targetDomain);
  } catch (e) {
    return false;
  }
}
function logRequest(event, statusCode, sizeByte, latencyMs, error) {
  const logEntry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    sourceIp: event.sourceIp,
    targetUrl: event.targetUrl,
    statusCode,
    responseSizeBytes: sizeByte,
    latencyMs,
    cached: false,
    error
  };
  console.log(JSON.stringify(logEntry));
}
var handler = async (event, context) => {
  const startTime = Date.now();
  const sourceIp = event.requestContext.http.sourceIp || "unknown";
  if (event.headers["x-origin-verify"] !== "library-explorer-proxy") {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Forbidden" }),
      headers: { "Content-Type": "application/json" }
    };
  }
  const targetUrl = event.queryStringParameters?.url;
  if (!targetUrl) {
    logRequest({ targetUrl: "", sourceIp }, 400, 0, Date.now() - startTime, "Missing url parameter");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or invalid 'url' query parameter" }),
      headers: { "Content-Type": "application/json" }
    };
  }
  try {
    if (!isDomainAllowed(targetUrl)) {
      const latency2 = Date.now() - startTime;
      logRequest({ targetUrl, sourceIp }, 403, 0, latency2, "Domain not whitelisted");
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Domain not whitelisted" }),
        headers: { "Content-Type": "application/json" }
      };
    }
    const fetchController = new AbortController();
    const fetchTimeout = setTimeout(() => fetchController.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(targetUrl, {
        signal: fetchController.signal,
        headers: {
          "User-Agent": "Library-Explorer-Proxy/1.0"
        }
      });
    } finally {
      clearTimeout(fetchTimeout);
    }
    const responseBody = await response.text();
    const responseSize = Buffer.byteLength(responseBody);
    if (responseSize > RESPONSE_SIZE_LIMIT_BYTES) {
      const latency2 = Date.now() - startTime;
      logRequest({ targetUrl, sourceIp }, 413, responseSize, latency2, "Response exceeds size limit");
      return {
        statusCode: 413,
        body: JSON.stringify({ error: "Response too large" }),
        headers: { "Content-Type": "application/json" }
      };
    }
    const latency = Date.now() - startTime;
    logRequest({ targetUrl, sourceIp }, response.status, responseSize, latency, null);
    return {
      statusCode: response.status,
      body: responseBody,
      headers: {
        ...Object.fromEntries(response.headers),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error?.name === "AbortError" ? "Request timeout" : error?.message || "Unknown error";
    logRequest({ targetUrl, sourceIp }, 504, 0, latency, errorMessage);
    return {
      statusCode: 504,
      body: JSON.stringify({ error: "Target API timeout or unreachable" }),
      headers: { "Content-Type": "application/json" }
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
