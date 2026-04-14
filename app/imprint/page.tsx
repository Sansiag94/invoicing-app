import type { Metadata } from "next";
import type { ReactNode } from "react";
import LegalDocument from "@/components/LegalDocument";
import { APP_NAME } from "@/lib/appBrand";
import { getLegalProfile } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Imprint",
  description: `Imprint and legal notice for ${APP_NAME}`,
  alternates: {
    canonical: "/imprint",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300 md:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export default async function ImprintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const legalProfile = getLegalProfile();
  const params = await searchParams;
  const linkSource = params.from === "settings" ? "settings" : "public";

  return (
    <LegalDocument
      title="Imprint"
      linkSource={linkSource}
      summary={`This page contains the basic legal notice and operator information for ${legalProfile.serviceName}. It is meant to keep the ownership and contact details easy to find from the public website and app.`}
      highlights={[
        {
          title: "Operator",
          description: legalProfile.tradingName
            ? `${legalProfile.legalEntityName} operates ${legalProfile.serviceName} under the trading name ${legalProfile.tradingName}.`
            : `${legalProfile.legalEntityName} operates ${legalProfile.serviceName}.`,
        },
        {
          title: "Main contact",
          description: `General legal and policy questions can be sent to ${legalProfile.contactEmail}.`,
        },
        {
          title: "Swiss-oriented service",
          description:
            "The product is presented as Swiss-focused invoicing software and the legal pages are written with Swiss and European privacy expectations in mind.",
        },
        {
          title: "More detail lives in the policy pages",
          description:
            "For data handling and service rules, the Privacy Policy and Terms of Service remain the controlling public references.",
        },
      ]}
    >
      <Section title="1. Company Information">
        <p>
          <strong>Operator:</strong> {legalProfile.legalEntityName}
        </p>
        {legalProfile.tradingName ? (
          <p>
            <strong>Trading name:</strong> {legalProfile.tradingName}
          </p>
        ) : null}
        <p>
          <strong>Service:</strong> {legalProfile.serviceName}
        </p>
        <p>
          <strong>Website:</strong> {legalProfile.websiteUrl}
        </p>
        {legalProfile.registrationNumber ? (
          <p>
            <strong>Registration / UID:</strong> {legalProfile.registrationNumber}
          </p>
        ) : null}
      </Section>

      <Section title="2. Contact">
        <p>
          <strong>Email:</strong> {legalProfile.contactEmail}
        </p>
        {legalProfile.phoneNumber ? (
          <p>
            <strong>Phone:</strong> {legalProfile.phoneNumber}
          </p>
        ) : null}
        <p>
          <strong>Correspondence address:</strong> {legalProfile.postalAddress}
        </p>
      </Section>

      <Section title="3. Legal Notice">
        <p>
          This website and app are operated from Switzerland. The public legal pages are intended
          to make it clear who operates the service, how to get in touch, and where to find the
          governing Privacy Policy and Terms of Service.
        </p>
      </Section>

      <Section title="4. Related Pages">
        <p>
          For more detail on data handling, retention, rights, and service rules, see the Privacy
          Policy and Terms of Service linked from this imprint and the site footer.
        </p>
      </Section>
    </LegalDocument>
  );
}
