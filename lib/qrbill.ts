import { SwissQRBill } from "swissqrbill/svg";

type InvoiceForQRBill = {
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
};

type BusinessForQRBill = {
  iban: string | null;
  name: string;
  address: string;
  country: string;
};

type ClientForQRBill = {
  companyName: string | null;
  contactName: string | null;
  email?: string | null;
  address: string;
  country: string;
};

type ParsedAddress = {
  address: string;
  buildingNumber?: string;
  zip: string;
  city: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toCountryCode(value: string, fallback = "CH"): string {
  const normalized = normalizeWhitespace(value).toUpperCase();

  if (normalized === "CH" || normalized === "SWITZERLAND" || normalized === "SCHWEIZ") {
    return "CH";
  }
  if (normalized === "DE" || normalized === "GERMANY" || normalized === "DEUTSCHLAND") {
    return "DE";
  }
  if (normalized === "FR" || normalized === "FRANCE") {
    return "FR";
  }
  if (normalized === "IT" || normalized === "ITALY" || normalized === "ITALIA") {
    return "IT";
  }
  if (normalized.length === 2) {
    return normalized;
  }

  return fallback;
}

function splitStreetAndBuilding(addressLine: string): {
  street: string;
  buildingNumber?: string;
} {
  const cleaned = normalizeWhitespace(addressLine);
  const match = cleaned.match(/^(.*\D)\s+([0-9]+[A-Za-z0-9/-]*)$/);

  if (!match) {
    return { street: cleaned.slice(0, 70) };
  }

  return {
    street: normalizeWhitespace(match[1]).slice(0, 70),
    buildingNumber: match[2].slice(0, 16),
  };
}

function parseAddress(addressRaw: string, countryCode: string): ParsedAddress {
  const fallbackZip = countryCode === "CH" ? "8000" : "0000";
  const fallbackCity = countryCode === "CH" ? "Zurich" : "City";

  const parts = addressRaw
    .split(/\r?\n|,/)
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 0);

  const firstLine = parts[0] ?? "Main Street 1";
  const { street, buildingNumber } = splitStreetAndBuilding(firstLine);

  let zip = fallbackZip;
  let city = fallbackCity;

  const zipCitySource = parts.find((part) => /\d{4,6}\s+.+/.test(part)) ?? parts[1] ?? "";
  const zipCityMatch = zipCitySource.match(/(\d{4,6})\s+(.+)/);

  if (zipCityMatch) {
    zip = zipCityMatch[1].slice(0, 16);
    city = normalizeWhitespace(zipCityMatch[2]).slice(0, 35);
  } else if (parts[1]) {
    city = normalizeWhitespace(parts[1]).slice(0, 35);
  }

  return {
    address: street.slice(0, 70),
    buildingNumber,
    zip,
    city,
  };
}

function makeReference(invoiceNumber: string): string {
  return normalizeWhitespace(invoiceNumber).slice(0, 25);
}

export function generateQRBill(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): string {
  const account = normalizeWhitespace(business.iban ?? "").replace(/\s/g, "");
  if (!account) {
    throw new Error("Missing business IBAN for Swiss QR-bill.");
  }

  const creditorCountry = toCountryCode(business.country, "CH");
  const debtorCountry = toCountryCode(client.country, "CH");
  const creditorAddress = parseAddress(business.address ?? "", creditorCountry);
  const debtorAddress = parseAddress(client.address ?? "", debtorCountry);
  const debtorName =
    normalizeWhitespace(client.companyName || client.contactName || client.email || "").slice(
      0,
      70
    ) || "Customer";

  const qrBill = new SwissQRBill(
    {
      amount: Number(invoice.totalAmount.toFixed(2)),
      currency: invoice.currency === "EUR" ? "EUR" : "CHF",
      reference: makeReference(invoice.invoiceNumber),
      message: `Invoice ${makeReference(invoice.invoiceNumber)}`.slice(0, 140),
      creditor: {
        account,
        name: normalizeWhitespace(business.name).slice(0, 70),
        address: creditorAddress.address,
        buildingNumber: creditorAddress.buildingNumber,
        zip: creditorAddress.zip,
        city: creditorAddress.city,
        country: creditorCountry,
      },
      debtor: {
        name: debtorName,
        address: debtorAddress.address,
        buildingNumber: debtorAddress.buildingNumber,
        zip: debtorAddress.zip,
        city: debtorAddress.city,
        country: debtorCountry,
      },
    },
    {
      language: "EN",
    }
  );

  return qrBill.toString();
}
