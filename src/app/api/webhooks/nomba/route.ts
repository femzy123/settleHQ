import { NextResponse } from "next/server";

import { canUseDb, getDb } from "@/db";
import { webhookEvents } from "@/db/schema";
import {
  verifyNombaWebhookSignature,
  type NombaWebhookPayload,
} from "@/lib/nomba-webhook";

type JsonObject = Record<string, unknown>;
type WebhookPayload = NombaWebhookPayload;

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

function getNombaSignatureHeaders(headers: Headers) {
  return {
    signature: headers.get("nomba-signature") ?? headers.get("nomba-sig-value"),
    timestamp: headers.get("nomba-timestamp"),
    algorithm: headers.get("nomba-signature-algorithm"),
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

  const signature = verifyNombaWebhookSignature({
    payload,
    secret: process.env.NOMBA_WEBHOOK_SECRET,
    headers: getNombaSignatureHeaders(request.headers),
  });

  if (!signature.ok) {
    const reason = signature.reason ?? "Invalid webhook signature";

    return NextResponse.json(
      { ok: false, error: reason },
      { status: reason.includes("configured") ? 500 : 401 },
    );
  }

  const data = asObject(payload.data);
  const merchant = asObject(data.merchant);
  const transaction = asObject(data.transaction);

  const event = {
    provider: "nomba",
    providerEventId: pickString(payload, ["requestId", "request_id", "id"]),
    eventType: pickString(payload, [
      "event_type",
      "event",
      "eventType",
      "type",
    ]),
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
        error:
          error instanceof Error ? error.message : "Webhook persistence failed",
      },
      { status: 500 },
    );
  }
}
