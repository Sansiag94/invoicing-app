import { describe, expect, it } from "vitest";
import { getDefaultDueDate, getTodayDateInputValue, toDateInputValue } from "@/lib/invoiceDates";

describe("invoice date helpers", () => {
  it("prefills today in YYYY-MM-DD format", () => {
    expect(getTodayDateInputValue(new Date("2026-03-15T10:20:30Z"))).toBe("2026-03-15");
  });

  it("sets the due date one month later while clamping month-end values", () => {
    expect(getDefaultDueDate("2026-03-15")).toBe("2026-04-15");
    expect(getDefaultDueDate("2026-01-31")).toBe("2026-02-28");
  });

  it("normalizes ISO strings for date inputs", () => {
    expect(toDateInputValue("2026-03-15T12:00:00.000Z")).toBe("2026-03-15");
  });
});
