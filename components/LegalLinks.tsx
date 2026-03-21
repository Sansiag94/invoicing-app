import Link from "next/link";
import { cn } from "@/lib/utils";

type LegalLinksProps = {
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
  source?: "public" | "settings";
};

export default function LegalLinks({
  className,
  linkClassName,
  separatorClassName,
  source = "public",
}: LegalLinksProps) {
  const suffix = source === "settings" ? "?from=settings" : "";

  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-sm", className)}>
      <Link
        href={`/imprint${suffix}`}
        className={cn(
          "font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-900",
          linkClassName
        )}
      >
        Imprint
      </Link>
      <span className={cn("text-slate-300", separatorClassName)}>|</span>
      <Link
        href={`/privacy${suffix}`}
        className={cn(
          "font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-900",
          linkClassName
        )}
      >
        Privacy Policy
      </Link>
      <span className={cn("text-slate-300", separatorClassName)}>|</span>
      <Link
        href={`/terms${suffix}`}
        className={cn(
          "font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-900",
          linkClassName
        )}
      >
        Terms of Service
      </Link>
    </div>
  );
}
