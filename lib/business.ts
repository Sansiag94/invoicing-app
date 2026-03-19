export type InvoiceSenderType = "company" | "owner";

type BusinessSenderFields = {
  name: string;
  ownerName?: string | null;
  invoiceSenderType?: string | null;
  bic?: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function normalizeInvoiceSenderType(value: string | null | undefined): InvoiceSenderType {
  return normalize(value).toLowerCase() === "owner" ? "owner" : "company";
}

export function getInvoiceSenderName(business: BusinessSenderFields): string {
  const companyName = normalize(business.name);
  const ownerName = normalize(business.ownerName);
  const senderType = normalizeInvoiceSenderType(business.invoiceSenderType);

  if (senderType === "owner" && ownerName) {
    return ownerName;
  }

  return companyName || ownerName || "Business";
}

export function getBusinessSenderPreferences(business: Pick<BusinessSenderFields, "ownerName" | "invoiceSenderType" | "bic">) {
  return {
    ownerName: normalize(business.ownerName),
    invoiceSenderType: normalizeInvoiceSenderType(business.invoiceSenderType),
    bic: normalize(business.bic),
  };
}
