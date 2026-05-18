import * as fs from "fs";
import * as path from "path";

/**
 * Extracts allowed domains from all source files in src/sources/.
 * Scans all implementation files and collects unique domains from URLs.
 */
export function extractAllowedDomains(): string[] {
    const sourcesDir = path.join(__dirname, "../../src/sources");
    const domains = new Set<string>();

    // Recursively find all .js files in src/sources/
    function walkDir(dir: string): void {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (file.endsWith(".js")) {
                const content = fs.readFileSync(fullPath, "utf-8");
                // Find all https:// URLs in the file
                const urlPattern = /https:\/\/[^\s"'`<>${]+/g;
                let match;
                while ((match = urlPattern.exec(content)) !== null) {
                    try {
                        const url = match[0].replace(/[,;)}\]`]$/, ""); // trim trailing punctuation
                        const urlObj = new URL(url);
                        if (urlObj.hostname) {
                            domains.add(urlObj.hostname);
                        }
                    } catch (e) {
                        // skip invalid URLs
                    }
                }
            }
        }
    }

    walkDir(sourcesDir);
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

if (require.main === module) {
    console.log("Allowed domains:", extractAllowedDomains());
}
