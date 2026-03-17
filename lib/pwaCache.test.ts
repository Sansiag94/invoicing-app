import { isPwaCacheKey } from "@/lib/pwaCache";

describe("pwa cache helpers", () => {
  it("matches only the app cache prefix", () => {
    expect(isPwaCacheKey("sierra-invoices-v2")).toBe(true);
    expect(isPwaCacheKey("other-cache")).toBe(false);
  });
});
