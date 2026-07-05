export type NombaPaymentWebhookPayload = Record<string, unknown>;
export type NombaPaymentMethod =
  "bank_transfer" | "checkout_card" | "checkout_transfer" | "unknown";

export type ParsedNombaPaymentWebhook = {
  eventType: string;
  requestId: string | null;
  orderReference: string | null;
  invoiceId: number | null;
  providerReference: string | null;
  providerSessionId: string | null;
  providerAccountId: string | null;
  amountKobo: number | null;
  paymentMethod: NombaPaymentMethod;
  paidAt: Date;
  metadata: Record<string, string>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function findFirstStringByKeys(value: unknown, keys: string[]) {
  const seen = new Set<unknown>();
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  function visit(current: unknown): string | null {
    if (!isObject(current) || seen.has(current)) {
      return null;
    }

    seen.add(current);

    for (const [key, nestedValue] of Object.entries(current)) {
      if (normalizedKeys.has(key.toLowerCase())) {
        const stringValue = asString(nestedValue);

        if (stringValue) {
          return stringValue;
        }
      }
    }

    for (const nestedValue of Object.values(current)) {
      const found = visit(nestedValue);

      if (found) {
        return found;
      }
    }

    return null;
  }

  return visit(value);
}

function findFirstNumberByKeys(value: unknown, keys: string[]) {
  const seen = new Set<unknown>();
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  function visit(current: unknown): number | null {
    if (!isObject(current) || seen.has(current)) {
      return null;
    }

    seen.add(current);

    for (const [key, nestedValue] of Object.entries(current)) {
      if (normalizedKeys.has(key.toLowerCase())) {
        const numberValue = asNumber(nestedValue);

        if (numberValue !== null) {
          return numberValue;
        }
      }
    }

    for (const nestedValue of Object.values(current)) {
      const found = visit(nestedValue);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  return visit(value);
}

function findMetadata(value: unknown): Record<string, string> {
  const seen = new Set<unknown>();
  const metadataKeys = new Set(["metadata", "ordermetadata"]);

  function visit(current: unknown): Record<string, string> | null {
    if (!isObject(current) || seen.has(current)) {
      return null;
    }

    seen.add(current);

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalizedKey = key.toLowerCase();

      if (metadataKeys.has(normalizedKey) && isObject(nestedValue)) {
        return Object.fromEntries(
          Object.entries(nestedValue)
            .filter(([, value]) => typeof value === "string")
            .map(([key, value]) => [key, value as string]),
        );
      }
    }

    for (const nestedValue of Object.values(current)) {
      const found = visit(nestedValue);

      if (found) {
        return found;
      }
    }

    return null;
  }

  return visit(value) ?? {};
}

function nairaAmountToKobo(amount: number | null) {
  if (amount === null || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function getPaymentMethod(
  payload: NombaPaymentWebhookPayload,
): NombaPaymentMethod {
  const rawMethod =
    findFirstStringByKeys(payload, [
      "paymentMethod",
      "payment_method",
      "method",
      "type",
    ])?.toLowerCase() ?? "";

  if (rawMethod.includes("card") || rawMethod.includes("purchase")) {
    return "checkout_card";
  }

  if (rawMethod.includes("transfer")) {
    return "checkout_transfer";
  }

  return "unknown";
}

function getPaidAt(payload: NombaPaymentWebhookPayload) {
  const time = findFirstStringByKeys(payload, [
    "time",
    "paidAt",
    "paid_at",
    "transactionDate",
  ]);
  const date = time ? new Date(time) : new Date();

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function parseNombaPaymentWebhook(
  payload: NombaPaymentWebhookPayload,
): ParsedNombaPaymentWebhook {
  const metadata = findMetadata(payload);
  const invoiceId = asNumber(metadata.invoiceId);
  const normalizedInvoiceId =
    invoiceId !== null && Number.isInteger(invoiceId) && invoiceId > 0
      ? invoiceId
      : null;

  return {
    eventType:
      findFirstStringByKeys(payload, ["event_type", "eventType", "event"]) ??
      "",
    requestId: findFirstStringByKeys(payload, ["requestId", "request_id"]),
    orderReference:
      findFirstStringByKeys(payload, [
        "orderReference",
        "order_reference",
        "merchantTxRef",
      ]) ??
      metadata.invoiceNumber ??
      null,
    invoiceId: normalizedInvoiceId,
    providerReference: findFirstStringByKeys(payload, [
      "transactionId",
      "transaction_id",
      "reference",
      "transactionReference",
      "paymentReference",
      "paymentVendorReference",
    ]),
    providerSessionId: findFirstStringByKeys(payload, [
      "sessionId",
      "session_id",
    ]),
    providerAccountId: findFirstStringByKeys(payload, [
      "walletId",
      "wallet_id",
    ]),
    amountKobo: nairaAmountToKobo(
      findFirstNumberByKeys(payload, [
        "transactionAmount",
        "amount",
        "paidAmount",
        "paid_amount",
      ]),
    ),
    paymentMethod: getPaymentMethod(payload),
    paidAt: getPaidAt(payload),
    metadata,
  };
}
