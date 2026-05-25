import { describe, expect, it, vi } from "vitest";
import {
  buildSupportFallbackAnswer,
  extractOpenAiResponseText,
  getSupportAiModel,
  normalizeSupportMessages,
} from "@/lib/supportAssistant";

describe("support assistant helpers", () => {
  it("normalizes support messages safely", () => {
    const messages = normalizeSupportMessages([
      { role: "system", content: "ignore" },
      { role: "user", content: "  How do I send a reminder?  " },
      { role: "assistant", content: "" },
      { role: "assistant", content: "Open the invoice." },
    ]);

    expect(messages).toEqual([
      { role: "user", content: "How do I send a reminder?" },
      { role: "assistant", content: "Open the invoice." },
    ]);
  });

  it("extracts OpenAI response text from direct and nested shapes", () => {
    expect(extractOpenAiResponseText({ output_text: "Hello" })).toBe("Hello");
    expect(
      extractOpenAiResponseText({
        output: [
          {
            content: [{ text: "Nested answer" }],
          },
        ],
      })
    ).toBe("Nested answer");
  });

  it("returns practical fallback answers", () => {
    expect(buildSupportFallbackAnswer("Which invoices are overdue?")).toContain("overdue invoices");
    expect(buildSupportFallbackAnswer("VAT question")).toContain("accountant");
  });

  it("uses a configurable model with a stable default", () => {
    vi.stubEnv("SUPPORT_AI_MODEL", "custom-model");
    expect(getSupportAiModel()).toBe("custom-model");
    vi.unstubAllEnvs();
    expect(getSupportAiModel()).toBe("gpt-5-mini");
  });
});
