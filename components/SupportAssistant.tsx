"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock3, FileText, LifeBuoy, Mail, Send, Sparkles, X } from "lucide-react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STARTER_PROMPTS = [
  {
    icon: FileText,
    text: "How do I create an invoice?",
  },
  {
    icon: Clock3,
    text: "Which of my invoices are overdue?",
  },
  {
    icon: Mail,
    text: "Can you send a payment reminder for me?",
  },
  {
    icon: Sparkles,
    text: "How do I add saved services?",
  },
];

function buildId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SupportAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canEscalate = messages.some((message) => message.role === "user");

  const apiMessages = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  async function askSupport(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: buildId(),
      role: "user",
      content: trimmedQuestion,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setStatusMessage(null);
    setIsSending(true);

    try {
      const response = await authenticatedFetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: pathname,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Support could not answer right now.");
      }

      setMessages((current) => [
        ...current,
        {
          id: buildId(),
          role: "assistant",
          content: data.answer || "I could not answer that. You can send this conversation to support.",
        },
      ]);
    } catch (error) {
      console.error("Support assistant failed:", error);
      setMessages((current) => [
        ...current,
        {
          id: buildId(),
          role: "assistant",
          content: "I could not answer that right now. Send this conversation to support and we will follow up by email.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askSupport(input);
  }

  async function handleEscalate() {
    if (!canEscalate || isEscalating) {
      return;
    }

    setIsEscalating(true);
    setStatusMessage(null);

    try {
      const response = await authenticatedFetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: pathname,
          messages: apiMessages,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Support request could not be sent.");
      }

      setStatusMessage("Sent to support. We will follow up by email.");
    } catch (error) {
      console.error("Support escalation failed:", error);
      setStatusMessage("The support email could not be sent right now.");
    } finally {
      setIsEscalating(false);
    }
  }

  function openWithPrompt(prompt: string) {
    setInput(prompt);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100",
          open && "pointer-events-none translate-y-2 opacity-0"
        )}
        aria-label="Open support assistant"
      >
        <Sparkles className="h-4 w-4" />
        Support
      </button>

      <div
        className={cn(
          "fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition duration-200 dark:border-slate-800 dark:bg-slate-950 sm:bottom-5 sm:right-5 sm:left-auto sm:mx-0 sm:w-[34rem]",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
        role="dialog"
        aria-modal="false"
        aria-label="Support assistant"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-950 dark:text-slate-50">Support</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Heidi can answer or send this to support</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            aria-label="Close support"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[38rem] max-h-[calc(100vh-7rem)] flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
                    <LifeBuoy className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">Hi, I&apos;m Heidi</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Your assistant for invoicing, expenses, and app workflow.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Try asking me</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STARTER_PROMPTS.map((prompt) => {
                      const Icon = prompt.icon;
                      return (
                        <button
                          key={prompt.text}
                          type="button"
                          onClick={() => openWithPrompt(prompt.text)}
                          className="flex min-h-20 items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 text-left text-sm font-medium text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:text-slate-100 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                            <Icon className="h-4 w-4" />
                          </span>
                          {prompt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                        message.role === "user"
                          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      Heidi is checking...
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {statusMessage ? (
              <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {statusMessage}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 p-2 shadow-sm dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask Heidi anything..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-800"
                  aria-label="Send question"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                  Heidi
                </span>
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={!canEscalate || isEscalating}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {isEscalating ? "Sending..." : "Send to support"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
