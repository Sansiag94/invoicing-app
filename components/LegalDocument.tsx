import type { ReactNode } from "react";
import LegalLinks from "@/components/LegalLinks";
import { APP_NAME } from "@/lib/appBrand";
import { getLegalProfile, LEGAL_LAST_UPDATED_LABEL } from "@/lib/legal";

type LegalDocumentProps = {
  title: string;
  summary: string;
  children: ReactNode;
};

export default function LegalDocument({
  title,
  summary,
  children,
}: LegalDocumentProps) {
  const legalProfile = getLegalProfile();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-8 md:py-10">
      <header className="space-y-4 rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {APP_NAME} legal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            {summary}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>Last updated {LEGAL_LAST_UPDATED_LABEL}</p>
          <LegalLinks />
        </div>
      </header>

      {legalProfile.incompleteFields.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
          <h2 className="text-base font-semibold text-amber-950">Review before production</h2>
          <p className="mt-2 leading-6">
            These legal pages are tailored to the app, but they still need your real business
            details before you should rely on them publicly.
          </p>
          <ul className="mt-3 space-y-2">
            {legalProfile.incompleteFields.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <article className="space-y-6 rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8">
        {children}
      </article>
    </div>
  );
}
