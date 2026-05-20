import * as fs from "fs";
import * as path from "path";

/**
 * Generates allowed domains from source files by executing their module code
 * and extracting URLs found in the source files.
 */
export function generateAllowedDomains(): string[] {
    const sourcesDir = path.join(__dirname, "../../src/sources");
    const domains = new Set<string>();

    function walkDir(dir: string): void {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (file.endsWith(".js")) {
                const content = fs.readFileSync(fullPath, "utf-8");
                // Extract all https:// URLs from the source file
                const urlPattern = /https:\/\/[^\s"'`<>{}$]+/g;
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
    const sorted = Array.from(domains).sort();

    if (sorted.length === 0) {
        throw new Error("No domains found in src/sources/. Ensure source files contain API URLs.");
    }

    return sorted;
}

/**
 * Generates the allowed-domains.ts file for import by the Lambda function.
 */
export function writeAllowedDomainsFile(outputPath: string): void {
    const domains = generateAllowedDomains();
    const content = `// Auto-generated at build time. Do not edit manually.
export const ALLOWED_DOMAINS = [
${domains.map((d) => `  "${d}",`).join("\n")}
];
`;
    fs.writeFileSync(outputPath, content, "utf-8");
    console.log(`Generated ${outputPath} with ${domains.length} domains`);
}
