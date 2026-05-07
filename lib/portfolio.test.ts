import { describe, expect, it } from "vitest";
import { normalizePortfolioItemInput, toPortfolioItemRecord } from "@/lib/portfolio";

describe("portfolio helpers", () => {
  it("normalizes service basics", () => {
    expect(
      normalizePortfolioItemInput({
        name: "Consulting",
        description: "Strategy session",
        unitPrice: "150",
        defaultQuantity: "2",
        taxRate: "8.1",
        active: false,
      })
    ).toEqual({
      name: "Consulting",
      description: "Strategy session",
      unitPrice: 150,
      defaultQuantity: 2,
      taxRate: 8.1,
      active: false,
    });
  });

  it("rejects invalid service values", () => {
    expect(normalizePortfolioItemInput({ name: "", description: "x", unitPrice: 1 })).toBeNull();
    expect(normalizePortfolioItemInput({ name: "x", description: "x", unitPrice: -1 })).toBeNull();
    expect(normalizePortfolioItemInput({ name: "x", description: "x", unitPrice: 1, defaultQuantity: 0 })).toBeNull();
  });

  it("serializes portfolio items", () => {
    expect(
      toPortfolioItemRecord({
        id: "item-1",
        businessId: "business-1",
        name: "Design",
        description: "Design work",
        unitPrice: 120,
        defaultQuantity: 1,
        taxRate: 0,
        active: true,
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-02T00:00:00.000Z"),
      })
    ).toMatchObject({
      id: "item-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z",
    });
  });
});
