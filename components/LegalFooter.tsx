import LegalLinks from "@/components/LegalLinks";
import { APP_NAME } from "@/lib/appBrand";
import { cn } from "@/lib/utils";

type LegalFooterProps = {
  className?: string;
};

export default function LegalFooter({ className }: LegalFooterProps) {
  return (
    <footer className={cn("border-t border-slate-200 bg-white/80 backdrop-blur", className)}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
        <p>{APP_NAME} legal information, contact details, and policy links.</p>
        <LegalLinks />
      </div>
    </footer>
  );
}
