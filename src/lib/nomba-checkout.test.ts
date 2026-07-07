import { describe, expect, it } from "vitest";

import {
  NOMBA_CHECKOUT_ALLOWED_PAYMENT_METHODS,
  buildCheckoutOrderPayload,
  getCheckoutLinkFromResponse,
  koboToCheckoutAmount,
} from "./nomba-checkout";

describe("nomba checkout helpers", () => {
  it("allows only Card and Transfer payment methods", () => {
    expect(NOMBA_CHECKOUT_ALLOWED_PAYMENT_METHODS).toEqual([
      "Card",
      "Transfer",
    ]);
  });
  it("converts kobo into checkout amount", () => {
    expect(koboToCheckoutAmount(150_000)).toBe(1500);
    expect(koboToCheckoutAmount(150_050)).toBe(1500.5);
  });

  it("rejects invalid checkout amounts", () => {
    expect(() => koboToCheckoutAmount(0)).toThrow();
    expect(() => koboToCheckoutAmount(10.5)).toThrow();
  });

  it("builds the Nomba checkout order payload with metadata", () => {
    expect(
      buildCheckoutOrderPayload({
        orderReference: "SHQ-BFA-INV-2026-000001",
        customerId: "42",
        customerEmail: "payer@example.com",
        amountKobo: 250_000,
        currency: "NGN",
        accountId: "sub-account-id",
        callbackUrl: "https://settlehq.test/invoice/token",
        metadata: {
          invoiceId: "12",
          organizationId: "7",
        },
      }),
    ).toEqual({
      order: {
        orderReference: "SHQ-BFA-INV-2026-000001",
        customerId: "42",
        callbackUrl: "https://settlehq.test/invoice/token",
        customerEmail: "payer@example.com",
        amount: 2500,
        currency: "NGN",
        accountId: "sub-account-id",
        allowedPaymentMethods: ["Card"],
        orderMetaData: {
          invoiceId: "12",
          organizationId: "7",
        },
      },
      tokenizeCard: false,
    });
  });

  it("extracts checkout details from wrapped Nomba responses", () => {
    expect(
      getCheckoutLinkFromResponse({
        data: {
          checkoutLink: "https://checkout.nomba.test/123",
          orderReference: "SHQ-BFA-INV-2026-000001",
        },
      }),
    ).toEqual({
      checkoutLink: "https://checkout.nomba.test/123",
      orderReference: "SHQ-BFA-INV-2026-000001",
    });
  });
});
