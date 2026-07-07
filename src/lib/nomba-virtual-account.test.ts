import { describe, expect, it } from "vitest";

import {
  buildPayerAccountRef,
  normalizeNombaVirtualAccountResponse,
  parseNombaVirtualAccountPayment,
} from "./nomba-virtual-account";

describe("nomba virtual account helpers", () => {
  it("builds a stable organization-scoped payer account reference", () => {
    expect(buildPayerAccountRef(12, 45)).toBe("SHQ-ORG-12-PAYER-45");
  });

  it("normalizes a virtual account creation response", () => {
    const account = normalizeNombaVirtualAccountResponse({
      data: {
        id: "va-123",
        accountRef: "SHQ-ORG-12-PAYER-45",
        accountNumber: "1234567890",
        accountName: "Aina School - John Doe",
        bankName: "Wema Bank",
        bankCode: "035",
      },
    });

    expect(account).toMatchObject({
      providerVirtualAccountId: "va-123",
      accountRef: "SHQ-ORG-12-PAYER-45",
      accountNumber: "1234567890",
      accountName: "Aina School - John Doe",
      bankName: "Wema Bank",
      bankCode: "035",
    });
  });

  it("parses a virtual account transfer webhook", () => {
    const parsed = parseNombaVirtualAccountPayment({
      event_type: "transaction.success",
      data: {
        transaction: {
          transactionId: "txn-123",
          sessionId: "session-123",
          amount: 105000,
          currency: "ngn",
          narration: "School fees",
          transactionDate: "2026-07-07T10:15:00.000Z",
          senderName: "John Doe",
          senderAccountNumber: "0123456789",
          destinationAccountNumber: "1234567890",
          aliasAccountReference: "SHQ-ORG-12-PAYER-45",
        },
      },
    });

    expect(parsed).toMatchObject({
      accountRef: "SHQ-ORG-12-PAYER-45",
      accountNumber: "1234567890",
      providerReference: "txn-123",
      providerTransactionId: "txn-123",
      providerSessionId: "session-123",
      amountKobo: 10_500_000,
      currency: "NGN",
      narration: "School fees",
      senderName: "John Doe",
      senderAccountNumber: "0123456789",
    });
    expect(parsed.paidAt.toISOString()).toBe("2026-07-07T10:15:00.000Z");
  });
});