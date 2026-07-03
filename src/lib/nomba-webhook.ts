import crypto from "node:crypto";

export type NombaWebhookJsonObject = Record<string, unknown>;
export type NombaWebhookPayload = NombaWebhookJsonObject;

export type NombaWebhookSignatureHeaders = {
  signature?: string | null;
  timestamp?: string | null;
  algorithm?: string | null;
};

function asObject(value: unknown): NombaWebhookJsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as NombaWebhookJsonObject)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function firstString(payload: NombaWebhookJsonObject, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getNombaWebhookSignaturePayload(
  payload: NombaWebhookPayload,
  timestamp: string,
) {
  const data = asObject(payload.data);
  const merchant = asObject(data.merchant);
  const transaction = asObject(data.transaction);
  let responseCode = asString(transaction.responseCode);

  if (responseCode.toLowerCase() === "null") {
    responseCode = "";
  }

  return [
    asString(payload.event_type),
    firstString(payload, ["requestId", "request_id"]),
    asString(merchant.userId),
    asString(merchant.walletId),
    asString(transaction.transactionId),
    asString(transaction.type),
    asString(transaction.time),
    responseCode,
    timestamp,
  ].join(":");
}

export function generateNombaWebhookSignature(
  payload: NombaWebhookPayload,
  secret: string,
  timestamp: string,
) {
  return crypto
    .createHmac("sha256", secret)
    .update(getNombaWebhookSignaturePayload(payload, timestamp), "utf8")
    .digest("base64");
}

export function verifyNombaWebhookSignature({
  payload,
  headers,
  secret,
}: {
  payload: NombaWebhookPayload;
  headers: NombaWebhookSignatureHeaders;
  secret?: string;
}) {
  if (!secret) {
    return { ok: false, reason: "Webhook secret is not configured" };
  }

  if (!headers.signature) {
    return { ok: false, reason: "Missing nomba-signature header" };
  }

  if (!headers.timestamp) {
    return { ok: false, reason: "Missing nomba-timestamp header" };
  }

  if (headers.algorithm && headers.algorithm.toLowerCase() !== "hmacsha256") {
    return { ok: false, reason: "Unsupported Nomba signature algorithm" };
  }

  const expectedSignature = generateNombaWebhookSignature(
    payload,
    secret,
    headers.timestamp,
  );

  if (!timingSafeEqualText(headers.signature.trim(), expectedSignature)) {
    return { ok: false, reason: "Invalid webhook signature" };
  }

  return { ok: true, reason: null };
}
