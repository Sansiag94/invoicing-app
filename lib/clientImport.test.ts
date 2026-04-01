import { describe, expect, it } from "vitest";
import {
  CLIENT_IMPORT_TEMPLATE,
  ClientImportFileError,
  parseCsvRows,
  prepareClientImportRows,
} from "@/lib/clientImport";

describe("client CSV import helpers", () => {
  it("parses quoted CSV values", () => {
    expect(parseCsvRows('companyName,contactName,email,phone,street,postalCode,city,country,language,vatNumber\n"Acme, GmbH",Maria,maria@example.com,,Mainstrasse 1,8000,Zurich,Switzerland,de,')).toEqual([
      ["companyName", "contactName", "email", "phone", "street", "postalCode", "city", "country", "language", "vatNumber"],
      ["Acme, GmbH", "Maria", "maria@example.com", "", "Mainstrasse 1", "8000", "Zurich", "Switzerland", "de", ""],
    ]);
  });

  it("creates new client rows and skips duplicate emails", () => {
    const { rowsToCreate, result } = prepareClientImportRows({
      csvText:
        `${CLIENT_IMPORT_TEMPLATE}` +
        "Acme GmbH,,billing@acme.ch,,Bahnhofstrasse 1,8000,Zurich,Switzerland,de,\n" +
        "Existing GmbH,,existing@example.com,,Seestrasse 2,8800,Thalwil,Switzerland,en,\n",
      existingEmails: ["existing@example.com"],
    });

    expect(rowsToCreate).toHaveLength(1);
    expect(rowsToCreate[0]).toMatchObject({
      companyName: "Acme GmbH",
      email: "billing@acme.ch",
      country: "Switzerland",
      language: "de",
    });
    expect(result).toEqual({
      createdCount: 1,
      skippedDuplicateCount: 1,
      invalidRowCount: 0,
      errors: [
        {
          rowNumber: 3,
          type: "duplicate",
          message: "A client with this email already exists in the workspace or earlier in the CSV.",
          email: "existing@example.com",
        },
      ],
    });
  });

  it("reports invalid rows without aborting the whole import", () => {
    const { rowsToCreate, result } = prepareClientImportRows({
      csvText:
        `${CLIENT_IMPORT_TEMPLATE}` +
        "Acme GmbH,,billing@acme.ch,,Bahnhofstrasse 1,8000,Zurich,Switzerland,de,\n" +
        ",,not-an-email,,Street,8000,Zurich,Switzerland,en,\n" +
        "No Country,,valid@example.com,,Street,8000,Zurich,,en,\n",
      existingEmails: [],
    });

    expect(rowsToCreate).toHaveLength(1);
    expect(result.createdCount).toBe(1);
    expect(result.invalidRowCount).toBe(2);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        type: "invalid",
        message: "Add either a companyName or a contactName.",
        email: "not-an-email",
      },
      {
        rowNumber: 4,
        type: "invalid",
        message: "street, postalCode, city, and a supported country are required.",
        email: "valid@example.com",
      },
    ]);
  });

  it("rejects incorrect headers", () => {
    expect(() =>
      prepareClientImportRows({
        csvText: "name,email\nAcme,billing@acme.ch\n",
        existingEmails: [],
      })
    ).toThrow(ClientImportFileError);
  });
});
