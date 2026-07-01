import { NextResponse } from "next/server";

import { getDb, canUseDb } from "@/db";
import { webhookEvents } from "@/db/schema";

type WebhookPayload = Record<string, unknown>;

export const runtime = "nodejs";

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

  const event = {
    provider: "nomba",
    providerEventId: pickString(payload, ["id", "eventId", "event_id"]),
    eventType: pickString(payload, ["event", "eventType", "event_type", "type"]),
    providerReference: pickString(payload, [
      "reference",
      "transactionReference",
      "transaction_reference",
      "paymentReference",
      "payment_reference",
    ]),
    providerSessionId: pickString(payload, ["sessionId", "session_id"]),
    providerAccountId: pickString(payload, ["accountId", "account_id", "subAccountId"]),
    signatureValid: null,
    processingStatus: "received",
    headers: headersToRecord(request.headers),
    rawPayload: payload,
  };

  if (!canUseDb()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      reason: "DATABASE_URL is not configured",
    });
  }

  try {
    const [storedEvent] = await getDb()
      .insert(webhookEvents)
      .values(event)
      .returning({ id: webhookEvents.id });

    return NextResponse.json({ ok: true, stored: true, id: storedEvent.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stored: false,
        error: error instanceof Error ? error.message : "Webhook persistence failed",
      },
      { status: 500 },
    );
  }
}
