import type { Metadata } from "next";
import type { ReactNode } from "react";
import LegalDocument from "@/components/LegalDocument";
import { APP_NAME } from "@/lib/appBrand";
import { getLegalProfile } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service | ${APP_NAME}`,
  description: `Terms of Service for ${APP_NAME}`,
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
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700 md:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  const legalProfile = getLegalProfile();

  return (
    <LegalDocument
      title="Terms of Service"
      summary={`These Terms of Service govern access to and use of ${legalProfile.serviceName}. By creating an account, using the service, or sending invoices through it, you agree to these terms.`}
    >
      <Section title="1. Service Provider">
        <p>
          {legalProfile.legalEntityName} provides and operates {legalProfile.serviceName}. For
          legal notices, you can contact us at <strong>{legalProfile.contactEmail}</strong> or by
          post at <strong>{legalProfile.postalAddress}</strong>.
        </p>
      </Section>

      <Section title="2. Eligibility and Accounts">
        <ul className="space-y-2">
          <li>
            You must provide accurate account information and keep your login credentials secure.
          </li>
          <li>
            You are responsible for activity that occurs under your account unless caused by our own
            misconduct.
          </li>
          <li>
            You must notify us promptly if you suspect unauthorized access, account misuse, or a
            security incident affecting your workspace.
          </li>
        </ul>
      </Section>

      <Section title="3. Permitted Use">
        <p>
          You may use {legalProfile.serviceName} to manage your business billing workflow,
          including business profiles, clients, invoices, reminders, expenses, public invoice
          pages, and related payment flows.
        </p>
        <p>
          You may not use the service for unlawful, fraudulent, misleading, abusive, infringing, or
          sanctions-violating activity, or in ways that interfere with the platform, third-party
          providers, or other users.
        </p>
      </Section>

      <Section title="4. Your Data and Compliance Responsibilities">
        <ul className="space-y-2">
          <li>
            You are responsible for the accuracy, legality, and completeness of the business, tax,
            client, invoice, and expense data you upload or send through the service.
          </li>
          <li>
            You must have a lawful basis and any required notices or permissions for personal data
            you upload about clients, contacts, invoice recipients, employees, or contractors.
          </li>
          <li>
            You remain responsible for your own invoicing, bookkeeping, VAT, tax, retention,
            and business-law obligations.
          </li>
          <li>
            The service provides workflow tools only and does not provide legal, tax, accounting, or
            regulated financial advice.
          </li>
        </ul>
      </Section>

      <Section title="5. Public Invoice Pages and Payment Links">
        <p>
          Public invoice links are designed to be shared with intended recipients. Anyone with a
          valid public link may be able to view the invoice details needed to review or pay that
          invoice.
        </p>
        <p>
          You are responsible for deciding when and to whom invoice links are sent, and for
          confirming that the invoice content is ready to be disclosed to those recipients.
        </p>
      </Section>

      <Section title="6. Third-Party Services">
        <p>
          {legalProfile.serviceName} relies on third-party providers for infrastructure,
          authentication, storage, email delivery, and payments. Stripe, Stripe Connect, and other
          third-party services may impose their own terms, onboarding requirements, fees, policies,
          and compliance obligations.
        </p>
        <p>
          If you connect payment features, you are responsible for completing any required Stripe or
          payment-provider onboarding, KYC, and account verification steps that apply to your use
          of those services.
        </p>
      </Section>

      <Section title="7. Availability and Changes">
        <p>
          We may modify, improve, suspend, or discontinue features from time to time. We aim to
          operate the service responsibly, but we do not guarantee uninterrupted or error-free
          availability.
        </p>
      </Section>

      <Section title="8. Workspace Closure and Record Retention">
        <p>
          Because invoices, payments, expenses, bookkeeping records, and related business documents
          may need to be retained under applicable law, workspace closure or deletion may be
          delayed, limited, or handled through an archival or support-led process instead of
          immediate erasure.
        </p>
        <p>
          You should maintain your own exports, backups, and retention workflow for records that
          must remain accessible to your business.
        </p>
      </Section>

      <Section title="9. Suspension and Termination">
        <p>
          We may suspend or terminate access if needed to protect the platform, comply with law,
          respond to abuse, address security issues, or enforce these terms.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          To the extent permitted by law, the service is provided on an as-is and as-available
          basis. We do not make guarantees about merchantability, fitness for a particular purpose,
          or uninterrupted availability.
        </p>
      </Section>

      <Section title="11. Limitation of Liability">
        <p>
          To the extent permitted by law, {legalProfile.legalEntityName} will not be liable for
          indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss
          of profits, revenue, goodwill, data, or business opportunity arising from use of the
          service.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot be excluded under applicable law.
        </p>
      </Section>

      <Section title="12. Governing Law and Venue">
        <p>
          These terms are governed by the laws of <strong>{legalProfile.governingLaw}</strong>,
          without regard to conflict-of-law rules. Unless mandatory law requires otherwise, the
          courts located in <strong>{legalProfile.jurisdiction}</strong> will have exclusive
          jurisdiction over disputes arising from these terms or the service.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions about these terms can be sent to <strong>{legalProfile.contactEmail}</strong>.
        </p>
      </Section>
    </LegalDocument>
  );
}
