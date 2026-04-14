import { describe, expect, it } from "vitest";
import { buildStoredReceiptPath, resolveReceiptStorageLocation } from "@/lib/receiptStorage";

describe("receipt storage helpers", () => {
  it("builds private object paths for receipts", () => {
    expect(buildStoredReceiptPath("business-1", "expense-2", "receipt.pdf")).toBe(
      "business-1/expense-2/receipt.pdf"
    );
  });

  it("resolves stored private receipt paths", () => {
    expect(resolveReceiptStorageLocation("business-1/expense-2/receipt.pdf", "expense-receipts")).toEqual({
      bucket: "expense-receipts",
      path: "business-1/expense-2/receipt.pdf",
    });
  });

  it("resolves legacy public Supabase object URLs", () => {
    expect(
      resolveReceiptStorageLocation(
        "https://example.supabase.co/storage/v1/object/public/expense-receipts/business-1/expense-2/receipt.pdf",
        "fallback"
      )
    ).toEqual({
      bucket: "expense-receipts",
      path: "business-1/expense-2/receipt.pdf",
    });
  });

  it("rejects unrelated external URLs", () => {
    expect(resolveReceiptStorageLocation("https://example.com/receipt.pdf", "expense-receipts")).toBeNull();
  });
});
