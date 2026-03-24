import { SwissQRBill, SwissQRCode } from "swissqrbill/svg";
import type { Data } from "swissqrbill/types";
import { normalizeInvoiceCurrency } from "@/lib/invoice";
import {
  buildInvoiceAdditionalInformation,
  getQrBillLanguage,
  normalizeInvoiceLanguage,
} from "@/lib/invoiceLanguage";

type InvoiceForQRBill = {
  invoiceNumber: string;
  reference?: string | null;
  totalAmount: number;
  currency: string;
  language?: string | null;
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
  line2?: string;
  zip: string;
  city: string;
};

export type SwissReferenceType = "NON" | "QRR" | "SCOR";

export type SwissQRBillMetadata = {
  account: string;
  referenceType: SwissReferenceType;
  reference: string | null;
  additionalInformation: string;
};

export type QRRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
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

  const line2 = parts.find((part, index) => index > 0 && part !== zipCitySource);

  return {
    address: street.slice(0, 70),
    buildingNumber,
    line2: line2?.slice(0, 70),
    zip,
    city,
  };
}

function toAddressLine1(parsedAddress: ParsedAddress): string {
  return [parsedAddress.address, parsedAddress.buildingNumber].filter(Boolean).join(" ").slice(0, 70);
}

function buildReference(): {
  referenceType: SwissReferenceType;
  reference: string | null;
} {
  return { referenceType: "NON", reference: null };
}

function getPayloadFields(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill,
  account: string,
  referenceType: SwissReferenceType,
  reference: string | null
): string[] {
  const creditorCountry = toCountryCode(business.country, "CH");
  const debtorCountry = toCountryCode(client.country, "CH");
  const creditorAddress = parseAddress(business.address ?? "", creditorCountry);
  const debtorAddress = parseAddress(client.address ?? "", debtorCountry);
  const debtorName =
    normalizeWhitespace(client.companyName || client.contactName || client.email || "").slice(0, 70) || "Customer";
  const additionalInformation = buildInvoiceAdditionalInformation(
    normalizeWhitespace(invoice.invoiceNumber) || "Invoice",
    normalizeInvoiceLanguage(invoice.language)
  ).slice(0, 140);
  const amount = Math.max(0, Number(invoice.totalAmount || 0)).toFixed(2);
  const currency = normalizeInvoiceCurrency(invoice.currency, "CHF");

  return [
    "SPC",
    "0200",
    "1",
    account,
    normalizeWhitespace(business.name).slice(0, 70),
    toAddressLine1(creditorAddress),
    creditorAddress.line2 || "",
    creditorAddress.zip,
    creditorAddress.city,
    creditorCountry,
    "",
    "",
    "",
    "",
    "",
    amount,
    currency,
    debtorName,
    toAddressLine1(debtorAddress),
    debtorAddress.line2 || "",
    debtorAddress.zip,
    debtorAddress.city,
    debtorCountry,
    referenceType,
    reference ?? "",
    additionalInformation,
    "EPD",
  ];
}

export function getSwissQRBillMetadata(
  invoice: InvoiceForQRBill,
  business: Pick<BusinessForQRBill, "iban">
): SwissQRBillMetadata {
  const account = normalizeWhitespace(business.iban ?? "").replace(/\s/g, "").toUpperCase();
  if (!account) {
    throw new Error("Missing business IBAN for Swiss QR-bill.");
  }

  const { referenceType, reference } = buildReference();
  const additionalInformation = buildInvoiceAdditionalInformation(
    normalizeWhitespace(invoice.invoiceNumber) || "Invoice",
    normalizeInvoiceLanguage(invoice.language)
  ).slice(0, 140);

  return {
    account,
    referenceType,
    reference,
    additionalInformation,
  };
}

function buildQRBillData(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): { data: Data; metadata: SwissQRBillMetadata } {
  const account = normalizeWhitespace(business.iban ?? "").replace(/\s/g, "").toUpperCase();
  if (!account) {
    throw new Error("Missing business IBAN for Swiss QR-bill.");
  }

  const { referenceType, reference } = buildReference();
  const creditorCountry = toCountryCode(business.country, "CH");
  const debtorCountry = toCountryCode(client.country, "CH");
  const creditorAddress = parseAddress(business.address ?? "", creditorCountry);
  const debtorAddress = parseAddress(client.address ?? "", debtorCountry);
  const debtorName =
    normalizeWhitespace(client.companyName || client.contactName || client.email || "").slice(0, 70) || "Customer";

  const amount = Number(Math.max(0, invoice.totalAmount || 0).toFixed(2));
  const currency = normalizeInvoiceCurrency(invoice.currency, "CHF");
  const additionalInformation = buildInvoiceAdditionalInformation(
    normalizeWhitespace(invoice.invoiceNumber) || "Invoice",
    normalizeInvoiceLanguage(invoice.language)
  ).slice(0, 140);

  const data: Data = {
    amount,
    currency,
    message: additionalInformation,
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
  };

  if (referenceType !== "NON" && reference) {
    data.reference = reference;
  }

  return {
    data,
    metadata: {
      account,
      referenceType,
      reference,
      additionalInformation,
    },
  };
}

function parseSvgRects(svg: string): QRRect[] {
  const rectTags = svg.match(/<rect[^>]*\/>/g) ?? [];

  return rectTags
    .map((tag) => {
      const xMatch = tag.match(/x=\"([^\"]+)\"/);
      const yMatch = tag.match(/y=\"([^\"]+)\"/);
      const widthMatch = tag.match(/width=\"([^\"]+)\"/);
      const heightMatch = tag.match(/height=\"([^\"]+)\"/);
      const fillMatch = tag.match(/fill=\"([^\"]+)\"/);

      if (!xMatch || !yMatch || !widthMatch || !heightMatch || !fillMatch) {
        return null;
      }

      const x = Number.parseFloat(xMatch[1].replace("mm", ""));
      const y = Number.parseFloat(yMatch[1].replace("mm", ""));
      const width = Number.parseFloat(widthMatch[1].replace("mm", ""));
      const height = Number.parseFloat(heightMatch[1].replace("mm", ""));

      if ([x, y, width, height].some((value) => Number.isNaN(value))) {
        return null;
      }

      return {
        x,
        y,
        width,
        height,
        fill: fillMatch[1],
      };
    })
    .filter((rect): rect is QRRect => rect !== null);
}

export function generateSwissQRPayload(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): string {
  const account = normalizeWhitespace(business.iban ?? "").replace(/\s/g, "").toUpperCase();
  if (!account) {
    throw new Error("Missing business IBAN for Swiss QR-bill.");
  }

  const { referenceType, reference } = buildReference();
  return getPayloadFields(invoice, business, client, account, referenceType, reference).join("\n");
}

export function generateQRBill(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): string {
  const qrBill = new SwissQRBill(buildQRBillData(invoice, business, client).data, {
    language: getQrBillLanguage(normalizeInvoiceLanguage(invoice.language)),
  });

  return qrBill.toString();
}

export function generateSwissQRCodeSvg(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): string {
  const qrCode = new SwissQRCode(buildQRBillData(invoice, business, client).data, 46);
  return qrCode.toString();
}

export function generateSwissQRCodeRects(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): QRRect[] {
  const svgMarkup = generateSwissQRCodeSvg(invoice, business, client);
  return parseSvgRects(svgMarkup);
}
