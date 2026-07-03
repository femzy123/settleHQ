import { describe, expect, it } from "vitest";

import {
  formatInvoiceNumber,
  getOrganizationInvoiceCode,
  getPayerInvoiceCode,
} from "./invoices";

describe("getOrganizationInvoiceCode", () => {
  it("uses an organization-aware acronym when possible", () => {
    expect(getOrganizationInvoiceCode("Bright Future Academy")).toBe("BFA");
    expect(getOrganizationInvoiceCode("Oak Estate")).toBe("OE");
  });

  it("falls back to a compact organization code", () => {
    expect(getOrganizationInvoiceCode("A")).toBe("AXX");
    expect(getOrganizationInvoiceCode("!!!")).toBe("ORG");
  });
});

describe("getPayerInvoiceCode", () => {
  it("prefers external IDs when present", () => {
    expect(
      getPayerInvoiceCode({
        payerName: "John Doe",
        payerExternalId: "Flat-12B",
      }),
    ).toBe("FLAT12B");
  });

  it("uses a readable payer signal from the payer name", () => {
    expect(getPayerInvoiceCode({ payerName: "John Doe" })).toBe("JDOE");
    expect(getPayerInvoiceCode({ payerName: "Maduka" })).toBe("MADUKA");
  });
});

describe("formatInvoiceNumber", () => {
  it("formats invoice numbers with organization and payer signals", () => {
    expect(
      formatInvoiceNumber({
        organizationName: "Bright Future Academy",
        payerName: "John Doe",
        year: 2026,
        serial: 42,
      }),
    ).toBe("SHQ-BFA-JDOE-INV-2026-000042");
  });
});
