import { describe, expect, it } from "vitest";

import { parseNombaPaymentWebhook } from "./nomba-payment";

describe("parseNombaPaymentWebhook", () => {
  it("extracts checkout reference, metadata, amount, and card method", () => {
    const parsed = parseNombaPaymentWebhook({
      event_type: "payment_success",
      requestId: "request-123",
      data: {
        merchant: {
          walletId: "wallet-123",
        },
        order: {
          orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
          orderMetaData: {
            invoiceId: "12",
            invoiceNumber: "SHQ-BFA-JDOE-INV-2026-000001",
            payerId: "42",
          },
        },
        transaction: {
          transactionId: "txn-123",
          sessionId: "session-123",
          type: "card",
          transactionAmount: 105000,
          time: "2026-07-04T10:00:00Z",
        },
      },
    });

    expect(parsed).toMatchObject({
      eventType: "payment_success",
      requestId: "request-123",
      orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
      invoiceId: 12,
      providerReference: "txn-123",
      providerSessionId: "session-123",
      providerAccountId: "wallet-123",
      amountKobo: 10_500_000,
      paymentMethod: "checkout_card",
      metadata: {
        invoiceId: "12",
        invoiceNumber: "SHQ-BFA-JDOE-INV-2026-000001",
        payerId: "42",
      },
    });
    expect(parsed.paidAt.toISOString()).toBe("2026-07-04T10:00:00.000Z");
  });

  it("falls back to invoice metadata when no order reference is present", () => {
    const parsed = parseNombaPaymentWebhook({
      event_type: "payment_success",
      data: {
        order: {
          metadata: {
            invoiceId: "20",
            invoiceNumber: "SHQ-OE-FLAT4-INV-2026-000020",
          },
        },
        transaction: {
          transactionId: "txn-456",
          type: "transfer",
          transactionAmount: "5000",
        },
      },
    });

    expect(parsed.orderReference).toBe("SHQ-OE-FLAT4-INV-2026-000020");
    expect(parsed.invoiceId).toBe(20);
    expect(parsed.amountKobo).toBe(500_000);
    expect(parsed.paymentMethod).toBe("checkout_transfer");
  });

  it("returns null amount for invalid or missing amounts", () => {
    const parsed = parseNombaPaymentWebhook({
      event_type: "payment_success",
      data: {
        transaction: {
          transactionId: "txn-789",
          transactionAmount: "not-a-number",
        },
      },
    });

    expect(parsed.amountKobo).toBeNull();
  });

  it("extracts checkout transaction lookup fields", () => {
    const parsed = parseNombaPaymentWebhook({
      event_type: "payment_success",
      data: {
        success: true,
        message: "success",
        order: {
          orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
          amount: 105000,
        },
        paymentMethod: "card",
        transactionDetails: {
          paymentReference: "pay-123",
          transactionDate: "2026-07-04T12:15:00.000Z",
        },
        cardDetails: {
          cardType: "Verve",
        },
      },
    });

    expect(parsed).toMatchObject({
      eventType: "payment_success",
      orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
      providerReference: "pay-123",
      amountKobo: 10_500_000,
      paymentMethod: "checkout_card",
    });
    expect(parsed.paidAt.toISOString()).toBe("2026-07-04T12:15:00.000Z");
  });
});
