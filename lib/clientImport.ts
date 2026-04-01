import { buildAddressString } from "@/lib/address";
import { resolveSupportedCountry } from "@/lib/countries";
import {
  isSupportedInvoiceLanguage,
  normalizeInvoiceLanguage,
  type InvoiceLanguage,
} from "@/lib/invoiceLanguage";
import type { ClientImportError, ClientImportResult } from "@/lib/types";
import { isValidEmail } from "@/lib/validation";

export const CLIENT_IMPORT_HEADERS = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "street",
  "postalCode",
  "city",
  "country",
  "language",
  "vatNumber",
] as const;

export const CLIENT_IMPORT_TEMPLATE = `${CLIENT_IMPORT_HEADERS.join(",")}\n`;

type ClientImportHeader = (typeof CLIENT_IMPORT_HEADERS)[number];

export type PreparedClientImportRow = {
  companyName: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  address: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  language: InvoiceLanguage;
  vatNumber: string | null;
};

function normalizeCell(value: string | undefined): string {
  return (value ?? "").trim();
}

function buildRowError(
  rowNumber: number,
  type: ClientImportError["type"],
  message: string,
  email: string | null
): ClientImportError {
  return {
    rowNumber,
    type,
    message,
    email,
  };
}

export class ClientImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientImportFileError";
  }
}

export function isClientImportFileError(error: unknown): error is ClientImportFileError {
  return error instanceof ClientImportFileError;
}

export function parseCsvRows(input: string): string[][] {
  const source = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === "\"") {
        if (source[index + 1] === "\"") {
          currentValue += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += character;
      }
      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\r" || character === "\n") {
      if (character === "\r" && source[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (inQuotes) {
    throw new ClientImportFileError("CSV parsing failed because a quoted field was not closed.");
  }

  currentRow.push(currentValue);
  if (currentRow.length > 1 || currentRow[0]?.trim()) {
    rows.push(currentRow);
  }

  return rows;
}

function assertClientImportHeaders(headerRow: string[]) {
  const normalizedHeaders = headerRow.map((cell) => normalizeCell(cell));

  if (normalizedHeaders.length !== CLIENT_IMPORT_HEADERS.length) {
    throw new ClientImportFileError(
      `CSV headers must exactly match: ${CLIENT_IMPORT_HEADERS.join(",")}`
    );
  }

  const isExactMatch = CLIENT_IMPORT_HEADERS.every(
    (header, index) => normalizedHeaders[index] === header
  );

  if (!isExactMatch) {
    throw new ClientImportFileError(
      `CSV headers must exactly match: ${CLIENT_IMPORT_HEADERS.join(",")}`
    );
  }
}

function toHeaderRecord(row: string[]): Record<ClientImportHeader, string> {
  return CLIENT_IMPORT_HEADERS.reduce(
    (record, header, index) => {
      record[header] = normalizeCell(row[index]);
      return record;
    },
    {} as Record<ClientImportHeader, string>
  );
}

export function prepareClientImportRows(input: {
  csvText: string;
  existingEmails: Iterable<string>;
}): {
  rowsToCreate: PreparedClientImportRow[];
  result: ClientImportResult;
} {
  const parsedRows = parseCsvRows(input.csvText);

  if (parsedRows.length === 0) {
    throw new ClientImportFileError("CSV file is empty.");
  }

  assertClientImportHeaders(parsedRows[0]);

  const existingEmails = new Set(
    Array.from(input.existingEmails, (email) => normalizeCell(email).toLowerCase()).filter(Boolean)
  );
  const rowsToCreate: PreparedClientImportRow[] = [];
  const errors: ClientImportError[] = [];
  let skippedDuplicateCount = 0;
  let invalidRowCount = 0;

  for (let index = 1; index < parsedRows.length; index += 1) {
    const row = parsedRows[index] ?? [];
    const rowNumber = index + 1;

    if (row.every((cell) => normalizeCell(cell) === "")) {
      continue;
    }

    if (row.length !== CLIENT_IMPORT_HEADERS.length) {
      invalidRowCount += 1;
      errors.push(
        buildRowError(
          rowNumber,
          "invalid",
          "Row does not match the template column count.",
          normalizeCell(row[2]) || null
        )
      );
      continue;
    }

    const record = toHeaderRecord(row);
    const companyName = record.companyName || null;
    const contactName = record.contactName || null;
    const email = record.email;
    const phone = record.phone || null;
    const street = record.street;
    const postalCode = record.postalCode;
    const city = record.city;
    const country = resolveSupportedCountry(record.country);
    const languageInput = record.language;
    const vatNumber = record.vatNumber || null;
    const normalizedEmail = email.toLowerCase();

    if (!companyName && !contactName) {
      invalidRowCount += 1;
      errors.push(
        buildRowError(
          rowNumber,
          "invalid",
          "Add either a companyName or a contactName.",
          email || null
        )
      );
      continue;
    }

    if (!email || !isValidEmail(email)) {
      invalidRowCount += 1;
      errors.push(
        buildRowError(rowNumber, "invalid", "Email must be present and valid.", email || null)
      );
      continue;
    }

    if (existingEmails.has(normalizedEmail)) {
      skippedDuplicateCount += 1;
      errors.push(
        buildRowError(
          rowNumber,
          "duplicate",
          "A client with this email already exists in the workspace or earlier in the CSV.",
          email
        )
      );
      continue;
    }

    if (!street || !postalCode || !city || !country) {
      invalidRowCount += 1;
      errors.push(
        buildRowError(
          rowNumber,
          "invalid",
          "street, postalCode, city, and a supported country are required.",
          email
        )
      );
      continue;
    }

    if (languageInput && !isSupportedInvoiceLanguage(languageInput)) {
      invalidRowCount += 1;
      errors.push(
        buildRowError(
          rowNumber,
          "invalid",
          "language must be one of: en, de, es, fr, it.",
          email
        )
      );
      continue;
    }

    existingEmails.add(normalizedEmail);
    rowsToCreate.push({
      companyName,
      contactName,
      email,
      phone,
      address: buildAddressString({ street, postalCode, city }),
      street,
      postalCode,
      city,
      country,
      language: normalizeInvoiceLanguage(languageInput),
      vatNumber,
    });
  }

  return {
    rowsToCreate,
    result: {
      createdCount: rowsToCreate.length,
      skippedDuplicateCount,
      invalidRowCount,
      errors,
    },
  };
}
