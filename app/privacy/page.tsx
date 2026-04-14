import type { Metadata } from "next";
import type { ReactNode } from "react";
import LegalDocument from "@/components/LegalDocument";
import { APP_NAME } from "@/lib/appBrand";
import { getLegalProfile } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${APP_NAME}`,
  alternates: {
    canonical: "/privacy",
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

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const legalProfile = getLegalProfile();
  const params = await searchParams;
  const linkSource = params.from === "settings" ? "settings" : "public";

  return (
    <LegalDocument
      title="Privacy Policy"
      linkSource={linkSource}
      summary={`This Privacy Policy explains how ${legalProfile.legalEntityName} handles personal data when you use ${legalProfile.serviceName}, receive invoice emails, visit public invoice pages, or pay invoices online. It is written to make the practical parts clear first, then the legal detail underneath.`}
      highlights={[
        {
          title: "We use your data to run the service",
          description:
            "Account, invoice, client, payment, and expense data are processed so the app can authenticate users, generate invoices, send reminders, and support payments.",
        },
        {
          title: "Your business still controls its own client relationships",
          description:
            "When customers store client and invoice-recipient data here, they usually remain the primary controller for that customer data while we act as their service provider.",
        },
        {
          title: "Public invoice links are intentionally shareable",
          description:
            "Anyone with a valid invoice link may be able to view the invoice details needed to review or pay it, so links should be shared carefully.",
        },
        {
          title: "Some records cannot be deleted immediately",
          description:
            "Invoice, payment, expense, and bookkeeping records may need to be retained for legal, tax, or audit reasons even after access ends.",
        },
      ]}
    >
      <Section title="1. Who We Are">
        <p>
          {legalProfile.legalEntityName}
          {legalProfile.legalForm ? `, ${legalProfile.legalForm},` : ""} operates{" "}
          {legalProfile.serviceName}
          {legalProfile.tradingName ? ` and uses ${legalProfile.tradingName} as a trading name or brand` : ""}.
          You can contact us about privacy matters at <strong>{legalProfile.contactEmail}</strong>{" "}
          or by post at <strong>{legalProfile.postalAddress}</strong>.
        </p>
        <p>
          This notice applies to account holders, team members, business contacts, invoice
          recipients, and visitors who interact with public invoice links or payment pages.
        </p>
      </Section>

      <Section title="2. Our Role">
        <p>
          For account, support, security, and service-management data, we generally act as the
          controller of personal data.
        </p>
        <p>
          When business customers use {legalProfile.serviceName} to store their own client,
          invoice, payment, and expense information, we generally process that data on their
          behalf. In those situations, the business customer is usually the primary controller for
          its client and invoice-recipient data, and we act as a processor or service provider
          except where we must use data for security, fraud prevention, legal compliance, or our
          own service operations.
        </p>
      </Section>

      <Section title="3. Personal Data We Process">
        <ul className="space-y-2">
          <li>
            Account and authentication data, such as email addresses, encrypted credentials,
            session information, and security-related login details.
          </li>
          <li>
            Business profile data, such as company or owner name, postal address, phone number,
            VAT number, IBAN, BIC, logo, and payment settings.
          </li>
          <li>
            Client and invoice data, such as company names, contact names, email addresses,
            billing addresses, invoice numbers, line items, notes, due dates, tax information, and
            invoice events.
          </li>
          <li>
            Expense and document data, such as expense descriptions, amounts, categories, dates,
            notes, and uploaded receipt files.
          </li>
          <li>
            Payment and settlement data, such as Stripe account identifiers, checkout session
            identifiers, payment status, amount, currency, and payment references.
          </li>
          <li>
            Support and onboarding data, such as emails, spreadsheets, notes, or setup details you
            share when asking for help or booking optional onboarding.
          </li>
          <li>
            Technical and device data generated when the service or public invoice pages are used,
            including log, browser, network, and session information made available by your device,
            hosting infrastructure, or integrated providers.
          </li>
        </ul>
      </Section>

      <Section title="4. How We Use Personal Data">
        <ul className="space-y-2">
          <li>To create and manage accounts, authenticate users, and secure the service.</li>
          <li>
            To let users create, send, display, duplicate, remind, download, and track invoices.
          </li>
          <li>To host business records, client records, expense records, and uploaded files.</li>
          <li>To send transactional emails such as welcome emails, invoice emails, and reminders.</li>
          <li>To enable online invoice payment and reconcile payment events.</li>
          <li>To answer support requests and provide optional onboarding assistance.</li>
          <li>To provide support, maintain uptime, troubleshoot incidents, and prevent abuse.</li>
          <li>
            To comply with bookkeeping, tax, anti-fraud, legal, regulatory, and audit obligations.
          </li>
        </ul>
      </Section>

      <Section title="5. Legal Bases">
        <p>
          Where Swiss data-protection law, the GDPR, or similar laws require a legal basis, we rely
          on the basis that fits the specific processing activity.
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Contract performance</strong> for account setup, authentication, invoice and
            expense features, public invoice pages, payment workflows, and support requested by
            users.
          </li>
          <li>
            <strong>Legal obligations</strong> for tax, bookkeeping, accounting retention,
            sanctions, fraud-prevention, dispute, and regulatory requirements.
          </li>
          <li>
            <strong>Legitimate interests</strong> for service security, abuse prevention,
            troubleshooting, product reliability, basic business administration, and defending legal
            claims, balanced against the rights and expectations of affected individuals.
          </li>
          <li>
            <strong>Consent</strong> where the service asks for consent, such as optional legal
            acknowledgements or future non-essential tracking if it is introduced.
          </li>
        </ul>
        <p>
          If processing relies on consent, you may withdraw that consent for future processing by
          contacting us at <strong>{legalProfile.contactEmail}</strong>, without affecting
          processing that was lawful before withdrawal.
        </p>
      </Section>

      <Section title="6. How Data Is Shared">
        <p>
          We share personal data only when needed to operate the service, comply with law, or
          protect our rights.
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Hosting, database, authentication, and file storage providers</strong> help us
            run the application and store data securely.
          </li>
          <li>
            <strong>Email delivery providers</strong> help us send welcome emails, invoices, and
            reminders.
          </li>
          <li>
            <strong>Support communications</strong> may include the messages and files you share
            with us when requesting onboarding or account help.
          </li>
          <li>
            <strong>Payment providers</strong> such as Stripe or Stripe Connect process online
            invoice payments and payment-account onboarding.
          </li>
          <li>
            <strong>Professional advisers, authorities, and courts</strong> may receive data where
            required for legal compliance, fraud prevention, enforcement, or dispute handling.
          </li>
        </ul>
        <p>
          We do not describe selling your personal data in this service model. If the way the
          platform uses data changes materially, this policy will be updated before that new use is
          relied on.
        </p>
      </Section>

      <Section title="7. Public Invoice Links and Online Payment">
        <p>
          If a business user shares a public invoice link, the invoice details needed to review or
          pay that invoice may be visible to anyone with that link. Public links should therefore be
          shared carefully and only with intended recipients.
        </p>
        <p>
          Online card payments are handled through third-party payment infrastructure. We do not
          receive or store full card numbers in the application database.
        </p>
      </Section>

      <Section title="8. Cookies, Local Storage, and Similar Technologies">
        <p>
          We use session technologies, cookies, and local storage for essential features such as
          authentication, session persistence, theme preferences, PWA behavior, security, and
          similar service functionality.
        </p>
        <p>
          This build does not describe advertising trackers or a separate marketing analytics stack.
          If non-essential tracking, advertising cookies, or profiling technologies are added later,
          we will update this Privacy Policy and obtain consent where required.
        </p>
      </Section>

      <Section title="9. International Transfers">
        <p>
          Our service providers may process data in Switzerland, the European Economic Area, the
          United Kingdom, the United States, and other countries where they operate.
        </p>
        <p>
          Where required, we rely on adequacy decisions, contractual safeguards, or comparable
          transfer mechanisms for cross-border processing.
        </p>
      </Section>

      <Section title="10. Retention and Deletion">
        <p>
          We retain personal data for as long as needed to provide the service, protect the
          platform, resolve disputes, enforce agreements, and comply with legal obligations.
        </p>
        <ul className="space-y-2">
          <li>
            Account and workspace records are usually kept while the account is active and for a
            reasonable period afterward for security, dispute, and business-continuity reasons.
          </li>
          <li>
            Invoice, payment, receipt, expense, bookkeeping, and audit-related records may need to
            be retained for the legal retention period that applies to the relevant business records.
          </li>
          <li>
            Transactional emails, support messages, logs, and security records are retained for the
            period needed to operate, secure, and evidence the service, then deleted or anonymized
            when no longer needed.
          </li>
        </ul>
        <p>
          Invoice, expense, payment, bookkeeping, and audit-related records may need to be kept
          even after account access ends. Because of those obligations, we do not promise immediate
          deletion of all records on request where retention is legally required.
        </p>
      </Section>

      <Section title="11. Your Rights">
        <p>
          Depending on the laws that apply to you, you may have rights to access, correct, export,
          restrict, object to, or request deletion of your personal data, and to complain to a data
          protection authority.
        </p>
        <p>
          To exercise those rights, contact us at <strong>{legalProfile.contactEmail}</strong>.
          If you are an invoice recipient and your data was uploaded by one of our business
          customers, we may need to direct your request to that customer where they act as the
          primary controller.
        </p>
        <p>
          You may also have the right to complain to a competent data-protection authority. In
          Switzerland, that authority is the Federal Data Protection and Information Commissioner
          (FDPIC). If you are in the EEA or UK, you may contact your local supervisory authority.
        </p>
      </Section>

      <Section title="12. Automated Decision-Making">
        <p>
          We do not use the current service to make decisions based solely on automated processing
          that produce legal or similarly significant effects for individuals. If that changes, this
          policy will be updated before that processing is relied on.
        </p>
      </Section>

      <Section title="13. Security">
        <p>
          We use technical and organizational measures designed to protect personal data. No method
          of storage, transmission, or security control is completely foolproof, so we cannot
          guarantee absolute security.
        </p>
      </Section>

      <Section title="14. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will post the updated
          version at <strong>{legalProfile.privacyUrl}</strong> and change the last-updated date at
          the top of this page.
        </p>
      </Section>
    </LegalDocument>
  );
}
