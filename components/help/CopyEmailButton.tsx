"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type CopyEmailButtonProps = {
  email: string;
  subject?: string;
  bodyLines?: string[];
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  className?: string;
};

function buildDraftText(email: string, subject?: string, bodyLines?: string[]): string {
  const lines = [`To: ${email}`];

  if (subject?.trim()) {
    lines.push(`Subject: ${subject.trim()}`);
  }

  if (bodyLines && bodyLines.length > 0) {
    lines.push("");
    lines.push(...bodyLines);
  }

  return lines.join("\n");
}

export default function CopyEmailButton({
  email,
  subject,
  bodyLines,
  label,
  variant = "default",
  className,
}: CopyEmailButtonProps) {
  const { toast } = useToast();

  async function handleCopy() {
    const payload = buildDraftText(email, subject, bodyLines);

    try {
      await navigator.clipboard.writeText(payload);
      toast({
        title: "Copied to clipboard",
        description:
          subject?.trim()
            ? "The email details are copied. Paste them into your email app."
            : "The support email address is copied.",
        variant: "success",
      });
    } catch (error) {
      console.error("Unable to copy email details:", error);
      toast({
        title: "Copy failed",
        description: `Use this email manually: ${email}`,
        variant: "error",
      });
    }
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={() => void handleCopy()}>
      <Copy className="h-4 w-4" />
      {label}
    </Button>
  );
}
