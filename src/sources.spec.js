import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    SOURCES,
    slvSearchFn,
    troveSearchFn,
    europeanaSearchFn,
    dplaSearchFn,
    locSearchFn,
} from "./sources.js";

describe("SLV", () => {
    it("perform a search for bees", async () => {
        const result = await slvSearchFn({ query: "bees", limit: 5, testing: true });
        expect(result.length).toBe(5);
    });
});

describe("Trove", () => {
    it("perform a search for bees", async () => {
        const result = await troveSearchFn({ query: "bees", limit: 5, testing: true });
        expect(result.length).toBe(35);
    });
});

describe("Europeana", () => {
    it("perform a search for bees", async () => {
        const result = await europeanaSearchFn({ query: "bees", testing: true });
        expect(result.length).toBe(24);
    });
});

describe("DPLA", () => {
    it("perform a search for bees", async () => {
        const result = await dplaSearchFn({ query: "bees", testing: true });
        expect(result.length).toBe(20);
    });
});

describe("LOC", () => {
    it("perform a search for bees", async () => {
        const result = await locSearchFn({ query: "bees", limit: 5, testing: true });
        expect(result.length).toBe(25);
    });
});
