import { describe, expect, it } from "vitest";

import { formatInvoiceNumber, getOrganizationInvoiceCode } from "./invoices";

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

describe("formatInvoiceNumber", () => {
  it("formats invoice numbers with organization, invoice marker, year, and serial", () => {
    expect(
      formatInvoiceNumber({
        organizationName: "Bright Future Academy",
        year: 2026,
        serial: 42,
      }),
    ).toBe("SHQ-BFA-INV-2026-000042");
  });
});
