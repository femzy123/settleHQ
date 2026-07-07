export const NOMBA_CHECKOUT_ALLOWED_PAYMENT_METHODS = [
  "Card",
] as const;

export type NombaCheckoutMetadata = Record<string, string>;

export type BuildCheckoutOrderInput = {
  orderReference: string;
  customerId: string;
  customerEmail: string;
  amountKobo: number;
  currency?: string;
  accountId: string;
  callbackUrl: string;
  metadata: NombaCheckoutMetadata;
};

export type NombaCheckoutOrderPayload = {
  order: {
    orderReference: string;
    customerId: string;
    callbackUrl: string;
    customerEmail: string;
    amount: number;
    currency: string;
    accountId: string;
    allowedPaymentMethods: [...typeof NOMBA_CHECKOUT_ALLOWED_PAYMENT_METHODS];
    orderMetaData: NombaCheckoutMetadata;
  };
  tokenizeCard: boolean;
};

export function koboToCheckoutAmount(amountKobo: number) {
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    throw new Error("Checkout amount must be a positive kobo integer.");
  }

  return Number((amountKobo / 100).toFixed(2));
}

export function buildCheckoutOrderPayload({
  orderReference,
  customerId,
  customerEmail,
  amountKobo,
  currency = "NGN",
  accountId,
  callbackUrl,
  metadata,
}: BuildCheckoutOrderInput): NombaCheckoutOrderPayload {
  return {
    order: {
      orderReference,
      customerId,
      callbackUrl,
      customerEmail,
      amount: koboToCheckoutAmount(amountKobo),
      currency,
      accountId,
      allowedPaymentMethods: [...NOMBA_CHECKOUT_ALLOWED_PAYMENT_METHODS],
      orderMetaData: metadata,
    },
    tokenizeCard: false,
  };
}

export function getCheckoutLinkFromResponse(response: unknown) {
  if (!response || typeof response !== "object") {
    return null;
  }

  const maybeResponse = response as {
    checkoutLink?: unknown;
    orderReference?: unknown;
    data?: { checkoutLink?: unknown; orderReference?: unknown };
  };

  const checkoutLink =
    maybeResponse.data?.checkoutLink ?? maybeResponse.checkoutLink;
  const orderReference =
    maybeResponse.data?.orderReference ?? maybeResponse.orderReference;

  if (typeof checkoutLink !== "string" || checkoutLink.length === 0) {
    return null;
  }

  return {
    checkoutLink,
    orderReference:
      typeof orderReference === "string" && orderReference.length > 0
        ? orderReference
        : null,
  };
}
