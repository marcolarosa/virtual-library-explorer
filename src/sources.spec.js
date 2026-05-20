import { describe, it, expect, vi, beforeEach } from "vitest";
import { source as slv } from "./sources/oceania/state-library-of-victoria.js";
import { source as europeana } from "./sources/europe/europeana.js";

describe("SLV", () => {
    it("perform a search for bees", async () => {
        const result = await slv.searchFn({ query: "bees", limit: 5 });
        expect(result.docs.length).toBe(5);
    });
});

describe("Europeana", () => {
    it("perform a search for bees", async () => {
        const result = await europeana.searchFn({ query: "bees" });
        expect(result.docs.length).toBe(24);
    });
});
