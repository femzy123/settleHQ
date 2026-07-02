import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getDb, canUseDb } from "@/db";
import { webhookEvents } from "@/db/schema";

type JsonObject = Record<string, unknown>;
type WebhookPayload = JsonObject;

export const runtime = "nodejs";

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function pickString(payload: WebhookPayload, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function headersToRecord(headers: Headers) {
  return Object.fromEntries(headers.entries());
}

function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getSignaturePayload(payload: WebhookPayload, timestamp: string) {
  const data = asObject(payload.data);
  const merchant = asObject(data.merchant);
  const transaction = asObject(data.transaction);
  let responseCode = asString(transaction.responseCode);

  if (responseCode.toLowerCase() === "null") {
    responseCode = "";
  }

  return [
    asString(payload.event_type),
    asString(payload.requestId),
    asString(merchant.userId),
    asString(merchant.walletId),
    asString(transaction.transactionId),
    asString(transaction.type),
    asString(transaction.time),
    responseCode,
    timestamp,
  ].join(":");
}

function verifyNombaSignature(payload: WebhookPayload, headers: Headers) {
  const secret = process.env.NOMBA_WEBHOOK_SECRET;
  const signatureHeader =
    headers.get("nomba-signature") ?? headers.get("nomba-sig-value");
  const timestamp = headers.get("nomba-timestamp");
  const algorithm = headers.get("nomba-signature-algorithm");

  if (!secret) {
    return { ok: false, reason: "Webhook secret is not configured" };
  }

  if (!signatureHeader) {
    return { ok: false, reason: "Missing nomba-signature header" };
  }

  if (!timestamp) {
    return { ok: false, reason: "Missing nomba-timestamp header" };
  }

  if (algorithm && algorithm.toLowerCase() !== "hmacsha256") {
    return { ok: false, reason: "Unsupported Nomba signature algorithm" };
  }

  const signaturePayload = getSignaturePayload(payload, timestamp);
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload, "utf8")
    .digest("base64");

  return {
    ok: timingSafeEqualText(signatureHeader.trim(), expectedSignature),
    reason: "Invalid webhook signature",
  };
}

function isDuplicateEventError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("webhook_events_unique_provider_event_id_idx");
}

export async function POST(request: Request) {
  let payload: WebhookPayload;

  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const signature = verifyNombaSignature(payload, request.headers);

  if (!signature.ok) {
    return NextResponse.json(
      { ok: false, error: signature.reason },
      { status: signature.reason.includes("configured") ? 500 : 401 },
    );
  }

  const data = asObject(payload.data);
  const merchant = asObject(data.merchant);
  const transaction = asObject(data.transaction);

  const event = {
    provider: "nomba",
    providerEventId: pickString(payload, ["requestId", "request_id", "id"]),
    eventType: pickString(payload, ["event_type", "event", "eventType", "type"]),
    providerReference:
      asString(transaction.aliasAccountReference) ||
      asString(transaction.transactionId) ||
      pickString(payload, ["reference", "transactionReference"]),
    providerSessionId: asString(transaction.sessionId) || null,
    providerAccountId: asString(merchant.walletId) || null,
    signatureValid: true,
    processingStatus: "verified",
    headers: headersToRecord(request.headers),
    rawPayload: payload,
  };

  if (!canUseDb()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      verified: true,
      reason: "DATABASE_URL is not configured",
    });
  }

  try {
    const [storedEvent] = await getDb()
      .insert(webhookEvents)
      .values(event)
      .returning({ id: webhookEvents.id });

    return NextResponse.json({
      ok: true,
      stored: true,
      verified: true,
      id: storedEvent.id,
    });
  } catch (error) {
    if (isDuplicateEventError(error)) {
      return NextResponse.json({
        ok: true,
        stored: false,
        verified: true,
        duplicate: true,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        stored: false,
        verified: true,
        error: error instanceof Error ? error.message : "Webhook persistence failed",
      },
      { status: 500 },
    );
  }
}
