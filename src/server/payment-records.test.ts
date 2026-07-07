import { describe, expect, it } from "vitest";

import {
  buildPaymentOverview,
  formatPaymentMethodLabel,
} from "./payment-records";

describe("formatPaymentMethodLabel", () => {
  it("labels checkout card payments as Card", () => {
    expect(formatPaymentMethodLabel("checkout_card")).toBe("Card");
    expect(formatPaymentMethodLabel("checkout card")).toBe("Card");
    expect(formatPaymentMethodLabel("card")).toBe("Card");
  });

  it("labels checkout transfer payments as Transfer", () => {
    expect(formatPaymentMethodLabel("checkout_transfer")).toBe("Transfer");
    expect(formatPaymentMethodLabel("bank_transfer")).toBe("Transfer");
    expect(formatPaymentMethodLabel("transfer")).toBe("Transfer");
  });

  it("formats unknown method labels safely", () => {
    expect(formatPaymentMethodLabel("unknown")).toBe("Unknown");
    expect(formatPaymentMethodLabel("mobile_money")).toBe("Mobile Money");
  });
});

describe("buildPaymentOverview", () => {
  it("builds payment ledger summary cards", () => {
    const cards = buildPaymentOverview({
      totalReceivedKobo: 420_000,
      totalPaymentCount: 4,
      todayReceivedKobo: 105_000,
      todayPaymentCount: 1,
      verifiedPaymentCount: 3,
      needsReviewCount: 1,
    });

    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({
      label: "Total Received",
      value: "₦4,200",
      helper: "4 payments",
    });
    expect(cards[1]).toMatchObject({
      label: "Received Today",
      value: "₦1,050",
      helper: "1 payment today",
    });
    expect(cards[2]).toMatchObject({
      label: "Verified Payments",
      value: "3",
    });
    expect(cards[3]).toMatchObject({
      label: "Needs Review",
      value: "1",
      helper: "Check failed or pending records",
    });
  });

  it("uses empty-state copy when there are no review exceptions", () => {
    const cards = buildPaymentOverview({
      totalReceivedKobo: 0,
      totalPaymentCount: 0,
      todayReceivedKobo: 0,
      todayPaymentCount: 0,
      verifiedPaymentCount: 0,
      needsReviewCount: 0,
    });

    expect(cards[3]).toMatchObject({
      value: "0",
      helper: "No exceptions open",
    });
  });
});
