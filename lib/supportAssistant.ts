export type SupportChatRole = "user" | "assistant";

export type SupportChatMessage = {
  role: SupportChatRole;
  content: string;
};

const MAX_MESSAGE_LENGTH = 1200;
const MAX_MESSAGES = 10;

export function getOpenAiApiKey(): string | null {
  const value = process.env.OPENAI_API_KEY?.trim();
  return value && value.length > 0 ? value : null;
}

export function getSupportAiModel(): string {
  return process.env.SUPPORT_AI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}

export function normalizeSupportMessages(value: unknown): SupportChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): SupportChatMessage | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;

      if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
        return null;
      }

      const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
      return trimmed ? { role, content: trimmed } : null;
    })
    .filter((message): message is SupportChatMessage => Boolean(message))
    .slice(-MAX_MESSAGES);
}

export function extractOpenAiResponseText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const directText = (value as { output_text?: unknown }).output_text;
  if (typeof directText === "string" && directText.trim()) {
    return directText.trim();
  }

  const output = (value as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  const text = output
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        return [];
      }

      return content
        .map((part) => {
          if (!part || typeof part !== "object") {
            return "";
          }
          const possibleText = (part as { text?: unknown }).text;
          return typeof possibleText === "string" ? possibleText : "";
        })
        .filter(Boolean);
    })
    .join("\n")
    .trim();

  return text || null;
}

export function buildSupportFallbackAnswer(question: string): string {
  const normalized = question.toLowerCase();

  if (normalized.includes("overdue")) {
    return "You can review overdue invoices from Invoices using the status filter, or open Analytics to see overdue exposure. If you want, send this conversation to support and we can check the specific records with you.";
  }

  if (normalized.includes("reminder")) {
    return "Open the invoice, then use the reminder action to send a payment reminder. The app also supports automated reminder emails when cron reminders are configured.";
  }

  if (normalized.includes("expense") || normalized.includes("receipt")) {
    return "Open Expenses to add costs, categories, receipt photos, and notes. Use the receipt buttons to take a photo or choose an existing file.";
  }

  if (normalized.includes("vat") || normalized.includes("tax")) {
    return "The app can show VAT fields and Swiss VAT visibility, but it does not replace tax advice. For final VAT or tax treatment, confirm with your accountant.";
  }

  return "I can help with invoices, clients, expenses, payments, reminders, analytics, and settings. I could not fully answer that from the built-in help, so you can send this conversation to support from here.";
}

export function formatSupportTranscript(messages: SupportChatMessage[]): string {
  return messages
    .map((message) => `${message.role === "user" ? "User" : "Heidi"}: ${message.content}`)
    .join("\n\n");
}
