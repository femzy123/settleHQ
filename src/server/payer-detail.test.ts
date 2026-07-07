import { describe, expect, it } from "vitest";

import { buildPayerSummary } from "./payer-detail";

describe("buildPayerSummary", () => {
  it("calculates outstanding balance from invoiced and paid totals", () => {
    expect(
      buildPayerSummary({
        totalInvoicedKobo: 300_000,
        totalPaidKobo: 105_000,
        invoiceCount: 3,
        paidInvoiceCount: 1,
        paymentCount: 1,
      }),
    ).toEqual({
      totalInvoicedKobo: 300_000,
      totalPaidKobo: 105_000,
      outstandingKobo: 195_000,
      invoiceCount: 3,
      paidInvoiceCount: 1,
      paymentCount: 1,
    });
  });

  it("does not return a negative outstanding balance after overpayment", () => {
    expect(
      buildPayerSummary({
        totalInvoicedKobo: 100_000,
        totalPaidKobo: 120_000,
        invoiceCount: 1,
        paidInvoiceCount: 1,
        paymentCount: 2,
      }).outstandingKobo,
    ).toBe(0);
  });
});
