import { SwissQRBill, SwissQRCode } from "swissqrbill/svg";
import type { Data } from "swissqrbill/types";

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

export type SwissQRBillMetadata = {
  account: string;
  reference: string;
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

  return {
    address: street.slice(0, 70),
    buildingNumber,
    zip,
    city,
  };
}

function mod97(value: string): number {
  let remainder = 0;

  for (const char of value) {
    const code = char.charCodeAt(0);
    const chunk =
      code >= 65 && code <= 90
        ? String(code - 55)
        : code >= 48 && code <= 57
          ? char
          : "";

    for (const digit of chunk) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder;
}

function isQRIBAN(account: string): boolean {
  const iid = Number.parseInt(account.slice(4, 9), 10);
  return Number.isFinite(iid) && iid >= 30000 && iid <= 31999;
}

function buildScorReference(invoiceNumber: string): string {
  const cleaned = normalizeWhitespace(invoiceNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = (cleaned || "INVOICE").slice(0, 21);
  const checksum = String(98 - mod97(`${body}RF00`)).padStart(2, "0");
  return `RF${checksum}${body}`;
}

function buildQRReference(invoiceNumber: string): string {
  const alphanumeric = normalizeWhitespace(invoiceNumber).toUpperCase();
  const digitPayload = alphanumeric
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .map((char) => {
      if (/\d/.test(char)) return char;
      return String(char.charCodeAt(0) - 55);
    })
    .join("");

  const body = (digitPayload || "0").slice(-26).padStart(26, "0");
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;

  for (const digit of body) {
    carry = table[(carry + Number(digit)) % 10];
  }

  const checksum = String((10 - carry) % 10);
  return `${body}${checksum}`;
}

function buildReference(invoiceNumber: string, account: string): string {
  return isQRIBAN(account) ? buildQRReference(invoiceNumber) : buildScorReference(invoiceNumber);
}

export function getSwissQRBillMetadata(
  invoice: InvoiceForQRBill,
  business: Pick<BusinessForQRBill, "iban">
): SwissQRBillMetadata {
  const account = normalizeWhitespace(business.iban ?? "").replace(/\s/g, "").toUpperCase();
  if (!account) {
    throw new Error("Missing business IBAN for Swiss QR-bill.");
  }

  return {
    account,
    reference: buildReference(invoice.invoiceNumber, account),
  };
}

function buildQRBillData(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): Data {
  const { account, reference } = getSwissQRBillMetadata(invoice, business);

  const creditorCountry = toCountryCode(business.country, "CH");
  const debtorCountry = toCountryCode(client.country, "CH");
  const creditorAddress = parseAddress(business.address ?? "", creditorCountry);
  const debtorAddress = parseAddress(client.address ?? "", debtorCountry);
  const debtorName =
    normalizeWhitespace(client.companyName || client.contactName || client.email || "").slice(
      0,
      70
    ) || "Customer";

  const currency: "CHF" | "EUR" = invoice.currency === "EUR" ? "EUR" : "CHF";
  const normalizedInvoiceNumber = normalizeWhitespace(invoice.invoiceNumber) || "Invoice";

  return {
    amount: Number(invoice.totalAmount.toFixed(2)),
    currency,
    reference,
    message: `Invoice ${normalizedInvoiceNumber}`.slice(0, 140),
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

export function generateQRBill(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): string {
  const qrBill = new SwissQRBill(buildQRBillData(invoice, business, client), {
    language: "EN",
  });

  return qrBill.toString();
}

export function generateSwissQRCodeRects(
  invoice: InvoiceForQRBill,
  business: BusinessForQRBill,
  client: ClientForQRBill
): QRRect[] {
  const qrCode = new SwissQRCode(buildQRBillData(invoice, business, client), 46);
  const svgMarkup = qrCode.toString();
  return parseSvgRects(svgMarkup);
}
