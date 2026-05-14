import { describe, it, expect, vi, beforeEach } from "vitest";
import { slvSearchFn } from "./sources/oceania/state-library-of-victoria.js";
import { troveSearchFn } from "./sources/oceania/trove.js";
import { europeanaSearchFn } from "./sources/europe/europeana.js";
import { dplaSearchFn } from "./sources/americas/digital-public-library-of-america.js";
import { locSearchFn } from "./sources/americas/library-of-congress.js";
import { SOURCES } from "./sources.js";

describe("SLV", () => {
    it("perform a search for bees", async () => {
        const result = await slvSearchFn({ query: "bees", limit: 5, testing: true });
        expect(result.docs.length).toBe(5);
    });
});

describe("Trove", () => {
    it("perform a search for bees", async () => {
        const result = await troveSearchFn({ query: "bees", limit: 5, testing: true });
        expect(result.docs.length).toBe(35);
    });
});

describe("Europeana", () => {
    it("perform a search for bees", async () => {
        const result = await europeanaSearchFn({ query: "bees", testing: true });
        expect(result.docs.length).toBe(24);
    });
});

describe.skip("DPLA", () => {
    it("perform a search for bees", async () => {
        const result = await dplaSearchFn({ query: "bees", testing: true });
        // expect(result.length).toBe(20);
    });
});

describe("LOC", () => {
    it("perform a search for bees", async () => {
        const result = await locSearchFn({ query: "bees", limit: 5, testing: true });
        expect(result.docs.length).toBe(25);
    });
});
