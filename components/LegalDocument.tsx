import Link from "next/link";
import type { ReactNode } from "react";
import LegalLinks from "@/components/LegalLinks";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appBrand";
import { getLegalProfile, LEGAL_LAST_UPDATED_LABEL } from "@/lib/legal";

type LegalDocumentProps = {
  title: string;
  summary: string;
  highlights?: Array<{
    title: string;
    description: string;
  }>;
  children: ReactNode;
};

export default function LegalDocument({
  title,
  summary,
  highlights,
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

      {highlights && highlights.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Return to the app</h2>
            <p className="text-sm leading-6 text-slate-600">
              Continue to your account or create a new workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </section>

      <article className="space-y-6 rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8">
        {children}
      </article>
    </div>
  );
}
