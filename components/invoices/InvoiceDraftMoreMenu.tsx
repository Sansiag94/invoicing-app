"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InvoiceDraftMoreMenuProps = {
  disabled?: boolean;
  onDeleteDraft: () => void;
  className?: string;
};

export default function InvoiceDraftMoreMenu({
  disabled = false,
  onDeleteDraft,
  className,
}: InvoiceDraftMoreMenuProps) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto", className)}
      >
        <MoreHorizontal className="h-4 w-4" />
        More
      </button>
    );
  }

  return (
    <details className={cn("group relative w-full sm:w-auto", className)}>
      <summary
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden sm:w-auto"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
        More
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-950">
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.closest("details")?.removeAttribute("open");
            onDeleteDraft();
          }}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-4 w-4" />
          Delete Draft
        </button>
      </div>
    </details>
  );
}
