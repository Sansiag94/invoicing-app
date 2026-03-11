import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Smart Invoice Lifecycle",
    description: "Create, send, track, and mark invoices paid with clear status visibility.",
    icon: FileText,
  },
  {
    title: "Online Payments",
    description: "Collect card payments through Stripe Checkout directly from public invoice links.",
    icon: CreditCard,
  },
  {
    title: "Secure Multi-Tenant Data",
    description: "Business-scoped data access with Supabase authentication and Prisma isolation.",
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-col justify-center gap-12">
      <section className="space-y-6">
        <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Invoicing SaaS
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Send professional invoices and get paid faster.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Built for small businesses that need reliable billing, automated payment links, and
          clear financial visibility.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardContent className="space-y-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">{feature.title}</h2>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">What you can do today</p>
        <ul className="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Generate branded PDF invoices
          </li>
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Share public payment links
          </li>
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Track paid, sent, and overdue invoices
          </li>
          <li className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Manage clients and business settings
          </li>
        </ul>
      </section>
    </div>
  );
}

