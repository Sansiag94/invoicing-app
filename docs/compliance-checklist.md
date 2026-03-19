# Compliance Checklist

This checklist helps turn the in-app legal pages into a production-ready compliance baseline. It is not legal advice and it does not replace local counsel.

## Launch blockers

- Replace the placeholder legal profile values by setting:
  - `LEGAL_ENTITY_NAME`
  - `LEGAL_CONTACT_EMAIL`
  - `LEGAL_POSTAL_ADDRESS`
- Review and confirm:
  - `LEGAL_SERVICE_NAME` if the public service name differs from the app name
  - `LEGAL_SUPPORT_EMAIL` if support should go to a different inbox
  - `LEGAL_GOVERNING_LAW`
  - `LEGAL_JURISDICTION`
- Confirm `NEXT_PUBLIC_APP_URL` points to the real production domain so invoice, privacy, and terms links resolve correctly.

## Vendor and transfer review

- Execute and retain vendor agreements or DPAs with your hosting, database, auth, storage, email, and payment providers.
- Review where each provider stores and accesses data, and whether you need Swiss or EU transfer safeguards such as adequacy coverage or standard contractual clauses.
- Confirm which sub-processors are used in production and keep that list current.

## Customer-data role review

- Decide and document when you act as controller versus processor/service provider.
- If other businesses use the app to store their client and invoice data, prepare a customer-facing DPA or data-processing clause.
- Make sure your business customers understand that they remain responsible for the notices and legal bases that apply to their own client data.

## Payments

- Review Stripe and Stripe Connect obligations for the exact payment model you use.
- If you ever route payments for multiple businesses through your own platform account, get legal review before production.
- Verify that refund, dispute, and chargeback handling is defined operationally.

## Record retention

- Confirm the retention period that applies to invoices, payment records, receipts, tax records, and audit logs for your business and customer base.
- Keep a retention and archival process outside the authentication lifecycle.
- Do not restore self-serve destructive deletion until you have a legally reviewed archival/export flow.

## Cookies and tracking

- The current build only documents essential storage and session behavior.
- If you add analytics, advertising, pixels, or profiling later, review whether consent and a separate cookie banner are required before deploying them.

## Notice placement

- Keep Privacy Policy and Terms links visible from the landing page, auth pages, and main app shell.
- Keep privacy links reachable from invoice emails and public invoice flows.
- If you ship native wrappers or app-store listings, mirror the privacy-policy link there too.

## Security and governance

- Keep an incident-response path and support mailbox monitored.
- Review access controls, secret handling, backups, and restoration procedures.
- Confirm that logging and monitoring do not expose secrets or more personal data than necessary.

## Final legal review

- Have local counsel review the final documents, payment model, retention policy, and controller/processor allocation before production launch.

## Useful official sources

- Swiss FDPIC, duty to provide information: https://www.edoeb.admin.ch/en/duty-to-provide-information
- Swiss FDPIC, privacy statements on the internet: https://www.edoeb.admin.ch/de/datenschutzerklaerungen-im-internet
- Swiss SME Portal, accounting records retention: https://www.kmu.admin.ch/kmu/en/home/concrete-know-how/finances/accounting-and-auditing/electronic-bookkeeping.html
- European Commission, information that must be given to individuals: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/what-information-must-be-given-individuals-whose-data-collected_en
- California Business and Professions Code section 22575: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575
