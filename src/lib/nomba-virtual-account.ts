export type NombaVirtualAccountResponse = Record<string, unknown>;

export type NormalizedNombaVirtualAccount = {
  providerVirtualAccountId: string | null;
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
  bankCode: string | null;
  accountRef: string | null;
  raw: NombaVirtualAccountResponse;
};

export type ParsedNombaVirtualAccountPayment = {
  accountRef: string | null;
  accountNumber: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  providerSessionId: string | null;
  providerAccountId: string | null;
  amountKobo: number | null;
  currency: string;
  narration: string | null;
  senderName: string | null;
  senderAccountNumber: string | null;
  paidAt: Date;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

function amountToKobo(amount: number | null) {
  if (amount === null || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function getPaidAt(payload: unknown) {
  const time = findFirstStringByKeys(payload, [
    "time",
    "paidAt",
    "paid_at",
    "transactionDate",
    "transaction_date",
    "createdAt",
  ]);
  const date = time ? new Date(time) : new Date();

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function buildPayerAccountRef(organizationId: number, payerId: number) {
  return `SHQ-ORG-${organizationId}-PAYER-${payerId}`;
}

export function normalizeNombaVirtualAccountResponse(
  response: NombaVirtualAccountResponse,
): NormalizedNombaVirtualAccount {
  const accountNumber = findFirstStringByKeys(response, [
    "accountNumber",
    "account_number",
    "virtualAccountNumber",
    "bankAccountNumber",
    "nuban",
  ]);

  if (!accountNumber) {
    throw new Error("Nomba virtual account response did not include an account number.");
  }

  return {
    providerVirtualAccountId: findFirstStringByKeys(response, [
      "virtualAccountId",
      "virtual_account_id",
      "accountId",
      "accountHolderId",
      "id",
    ]),
    accountNumber,
    accountName: findFirstStringByKeys(response, [
      "accountName",
      "account_name",
      "virtualAccountName",
      "bankAccountName",
    ]),
    bankName: findFirstStringByKeys(response, ["bankName", "bank_name", "bank"]),
    bankCode: findFirstStringByKeys(response, ["bankCode", "bank_code"]),
    accountRef: findFirstStringByKeys(response, ["accountRef", "account_ref"]),
    raw: response,
  };
}

export function parseNombaVirtualAccountPayment(
  payload: Record<string, unknown>,
): ParsedNombaVirtualAccountPayment {
  const amount = findFirstNumberByKeys(payload, [
    "amount",
    "transactionAmount",
    "paidAmount",
    "paid_amount",
  ]);

  return {
    accountRef: findFirstStringByKeys(payload, [
      "accountRef",
      "account_ref",
      "aliasAccountReference",
      "accountReference",
    ]),
    accountNumber: findFirstStringByKeys(payload, [
      "accountNumber",
      "account_number",
      "virtualAccountNumber",
      "destinationAccountNumber",
      "nuban",
    ]),
    providerReference: findFirstStringByKeys(payload, [
      "transactionId",
      "transaction_id",
      "reference",
      "transactionReference",
      "paymentReference",
      "paymentVendorReference",
      "aliasAccountReference",
    ]),
    providerTransactionId: findFirstStringByKeys(payload, [
      "transactionId",
      "transaction_id",
      "id",
    ]),
    providerSessionId: findFirstStringByKeys(payload, ["sessionId", "session_id"]),
    providerAccountId: findFirstStringByKeys(payload, ["walletId", "wallet_id"]),
    amountKobo: amountToKobo(amount),
    currency:
      findFirstStringByKeys(payload, ["currency", "currencyCode"])?.toUpperCase() ??
      "NGN",
    narration: findFirstStringByKeys(payload, ["narration", "description"]),
    senderName: findFirstStringByKeys(payload, [
      "senderName",
      "sender_name",
      "sourceAccountName",
      "source_account_name",
    ]),
    senderAccountNumber: findFirstStringByKeys(payload, [
      "senderAccountNumber",
      "sender_account_number",
      "sourceAccountNumber",
      "source_account_number",
    ]),
    paidAt: getPaidAt(payload),
  };
}