import { and, eq, or } from "drizzle-orm";

import { getDb } from "@/db";
import {
  invoicePaymentOptions,
  invoices,
  organizationLedgerEntries,
  payments,
  receipts,
  reconciliationEvents,
  webhookEvents,
} from "@/db/schema";
import {
  parseNombaPaymentWebhook,
  type NombaPaymentWebhookPayload,
  type ParsedNombaPaymentWebhook,
} from "@/lib/nomba-payment";

export class PaymentProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProcessingError";
  }
}

type Db = ReturnType<typeof getDb>;

type PaymentOptionWithInvoice = typeof invoicePaymentOptions.$inferSelect & {
  invoice: typeof invoices.$inferSelect;
};

function isPaymentSuccess(eventType: string) {
  return eventType === "payment_success";
}

function getProviderReference(parsed: ParsedNombaPaymentWebhook) {
  return (
    parsed.providerReference ??
    parsed.providerSessionId ??
    parsed.orderReference ??
    parsed.requestId
  );
}

function getProviderStatus(parsed: ParsedNombaPaymentWebhook) {
  return isPaymentSuccess(parsed.eventType) ? "success" : "pending";
}

function getReceiptNumber(paymentId: number) {
  return `SHQ-RCPT-${String(paymentId).padStart(8, "0")}`;
}

async function findPaymentOptionForWebhook(
  parsed: ParsedNombaPaymentWebhook,
  db: Db,
): Promise<PaymentOptionWithInvoice | null> {
  const conditions = [];

  if (parsed.invoiceId) {
    conditions.push(eq(invoicePaymentOptions.invoiceId, parsed.invoiceId));
  }

  if (parsed.orderReference) {
    conditions.push(
      eq(invoicePaymentOptions.orderReference, parsed.orderReference),
      eq(invoicePaymentOptions.providerReference, parsed.orderReference),
    );
  }

  if (conditions.length === 0) {
    return null;
  }

  const [row] = await db
    .select({
      option: invoicePaymentOptions,
      invoice: invoices,
    })
    .from(invoicePaymentOptions)
    .innerJoin(invoices, eq(invoicePaymentOptions.invoiceId, invoices.id))
    .where(
      and(
        eq(invoicePaymentOptions.provider, "nomba"),
        eq(invoicePaymentOptions.optionType, "checkout"),
        or(...conditions)!,
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row.option,
    invoice: row.invoice,
  };
}

async function findExistingPayment(providerReference: string, db: Db) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.provider, "nomba"),
        eq(payments.providerReference, providerReference),
      ),
    )
    .limit(1);

  return payment ?? null;
}

async function receiptExistsForPayment(paymentId: number, db: Db) {
  const [receipt] = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(eq(receipts.paymentId, paymentId))
    .limit(1);

  return Boolean(receipt);
}

async function ledgerEntryExists(reference: string, db: Db) {
  const [entry] = await db
    .select({ id: organizationLedgerEntries.id })
    .from(organizationLedgerEntries)
    .where(eq(organizationLedgerEntries.reference, reference))
    .limit(1);

  return Boolean(entry);
}

async function updateWebhookStatus(
  webhookEventId: number,
  values: Partial<typeof webhookEvents.$inferInsert>,
  db: Db,
) {
  await db
    .update(webhookEvents)
    .set({ ...values, processedAt: new Date() })
    .where(eq(webhookEvents.id, webhookEventId));
}

export async function processVerifiedNombaWebhook(
  webhookEventId: number,
  payload: NombaPaymentWebhookPayload,
  db = getDb(),
) {
  const parsed = parseNombaPaymentWebhook(payload);

  if (!isPaymentSuccess(parsed.eventType)) {
    await updateWebhookStatus(
      webhookEventId,
      {
        processingStatus: "processed",
        errorMessage: null,
      },
      db,
    );

    return { processed: false, reason: "Unsupported event type" };
  }

  const providerReference = getProviderReference(parsed);

  if (!providerReference) {
    await updateWebhookStatus(
      webhookEventId,
      {
        processingStatus: "failed",
        errorMessage: "Webhook does not include a usable payment reference.",
      },
      db,
    );

    return { processed: false, reason: "Missing payment reference" };
  }

  if (!parsed.amountKobo || parsed.amountKobo <= 0) {
    await updateWebhookStatus(
      webhookEventId,
      {
        processingStatus: "failed",
        errorMessage: "Webhook does not include a valid payment amount.",
      },
      db,
    );

    return { processed: false, reason: "Missing payment amount" };
  }

  const paymentOption = await findPaymentOptionForWebhook(parsed, db);

  if (!paymentOption) {
    await updateWebhookStatus(
      webhookEventId,
      {
        processingStatus: "failed",
        errorMessage: "Webhook could not be matched to a Checkout invoice.",
      },
      db,
    );

    return { processed: false, reason: "Unmatched payment" };
  }

  const existingPayment = await findExistingPayment(providerReference, db);

  if (existingPayment) {
    await updateWebhookStatus(
      webhookEventId,
      {
        organizationId: paymentOption.organizationId,
        invoiceId: paymentOption.invoiceId,
        processingStatus: "duplicate",
        errorMessage: null,
      },
      db,
    );

    return {
      processed: true,
      duplicate: true,
      paymentId: existingPayment.id,
      invoiceId: paymentOption.invoiceId,
    };
  }

  const invoice = paymentOption.invoice;
  const amountPaidKobo = invoice.amountPaidKobo + parsed.amountKobo;
  const invoiceStatus =
    amountPaidKobo === invoice.amountDueKobo
      ? "paid"
      : "reconciliation_required";
  const reconciliationStatus =
    amountPaidKobo === invoice.amountDueKobo
      ? "matched_automatically"
      : amountPaidKobo < invoice.amountDueKobo
        ? "underpayment"
        : "overpayment";
  const matchType = parsed.orderReference
    ? "checkout_reference"
    : "checkout_metadata";

  const [payment] = await db
    .insert(payments)
    .values({
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      collectionId: invoice.collectionId,
      payerId: invoice.payerId,
      invoicePaymentOptionId: paymentOption.id,
      webhookEventId,
      amountKobo: parsed.amountKobo,
      currency: invoice.currency,
      paymentMethod: parsed.paymentMethod,
      provider: "nomba",
      providerReference,
      providerSessionId: parsed.providerSessionId,
      providerStatus: getProviderStatus(parsed),
      verificationStatus: "verified",
      paidAt: parsed.paidAt,
      verifiedAt: new Date(),
      rawProviderPayload: payload,
    })
    .returning();

  await db
    .update(invoices)
    .set({
      amountPaidKobo,
      status: invoiceStatus,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id));

  await db
    .update(invoicePaymentOptions)
    .set({
      checkoutStatus: "paid",
      providerSessionId: parsed.providerSessionId,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(invoicePaymentOptions.id, paymentOption.id));

  if (
    invoiceStatus === "paid" &&
    !(await receiptExistsForPayment(payment.id, db))
  ) {
    await db.insert(receipts).values({
      organizationId: invoice.organizationId,
      paymentId: payment.id,
      invoiceId: invoice.id,
      payerId: invoice.payerId,
      receiptNumber: getReceiptNumber(payment.id),
      amountKobo: parsed.amountKobo,
      currency: invoice.currency,
    });
  }

  const ledgerReference = `nomba:payment:${providerReference}`;

  if (!(await ledgerEntryExists(ledgerReference, db))) {
    await db.insert(organizationLedgerEntries).values({
      organizationId: invoice.organizationId,
      paymentId: payment.id,
      entryType: "payment_credit",
      direction: "credit",
      amountKobo: parsed.amountKobo,
      currency: invoice.currency,
      reference: ledgerReference,
      description: `Payment received for ${invoice.invoiceNumber}`,
      metadata: {
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber,
        payerId: String(invoice.payerId),
        collectionId: String(invoice.collectionId),
        providerReference,
      },
    });
  }

  await db.insert(reconciliationEvents).values({
    organizationId: invoice.organizationId,
    webhookEventId,
    paymentId: payment.id,
    invoiceId: invoice.id,
    invoicePaymentOptionId: paymentOption.id,
    reconciliationStatus,
    matchType,
    confidenceScore: "100.00",
    expectedAmountKobo: invoice.amountDueKobo,
    receivedAmountKobo: parsed.amountKobo,
    reason:
      reconciliationStatus === "matched_automatically"
        ? "Checkout payment matched by order reference or invoice metadata."
        : "Checkout payment amount differs from the invoice amount.",
  });

  await updateWebhookStatus(
    webhookEventId,
    {
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      processingStatus: "processed",
      errorMessage: null,
    },
    db,
  );

  return {
    processed: true,
    duplicate: false,
    paymentId: payment.id,
    invoiceId: invoice.id,
    invoiceStatus,
    reconciliationStatus,
  };
}
type CheckoutLookupPayload = Record<string, unknown>;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return isJsonObject(value) ? value : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function checkoutLookupData(payload: unknown) {
  const root = objectValue(payload);
  return objectValue(root.data ?? root);
}

function isSuccessfulCheckoutLookup(payload: unknown) {
  const data = checkoutLookupData(payload);
  const success = data.success;
  const message = stringValue(data.message)?.toLowerCase() ?? "";

  return success === true || success === "true" || message === "success";
}

function normalizeCheckoutLookupPayload(
  rawPayload: unknown,
  paymentOption: PaymentOptionWithInvoice,
): NombaPaymentWebhookPayload {
  const data = checkoutLookupData(rawPayload);
  const order = objectValue(data.order);
  const transactionDetails = objectValue(data.transactionDetails);
  const transferDetails = objectValue(data.transferDetails);
  const cardDetails = objectValue(data.cardDetails);
  const orderReference =
    stringValue(order.orderReference) ?? paymentOption.orderReference;
  const amount =
    numberValue(order.amount) ?? paymentOption.expectedAmountKobo / 100;
  const paymentReference =
    stringValue(transactionDetails.paymentReference) ??
    stringValue(transferDetails.paymentReference) ??
    stringValue(transactionDetails.paymentVendorReference) ??
    orderReference;
  const paymentMethod = Object.keys(transferDetails).length
    ? "transfer"
    : Object.keys(cardDetails).length
      ? "card"
      : "checkout";

  return {
    event_type: "payment_success",
    requestId: paymentReference ? `checkout-${paymentReference}` : null,
    orderReference,
    transactionAmount: amount,
    transactionId: paymentReference,
    sessionId: stringValue(transferDetails.sessionId),
    paymentMethod,
    transactionDate: stringValue(transactionDetails.transactionDate),
    metadata: {
      invoiceId: String(paymentOption.invoiceId),
      invoiceNumber: paymentOption.invoice.invoiceNumber,
      collectionId: String(paymentOption.invoice.collectionId),
      payerId: String(paymentOption.invoice.payerId),
    },
    data,
  };
}

export async function processNombaCheckoutTransactionLookup(
  orderReference: string,
  rawPayload: CheckoutLookupPayload,
  db = getDb(),
) {
  const lookupPayload = rawPayload as NombaPaymentWebhookPayload;
  const lookupParsed = parseNombaPaymentWebhook({
    ...lookupPayload,
    event_type: "payment_success",
    orderReference,
  });
  const paymentOption = await findPaymentOptionForWebhook(lookupParsed, db);

  if (!paymentOption) {
    return { processed: false, reason: "Unmatched checkout order" };
  }

  if (!isSuccessfulCheckoutLookup(rawPayload)) {
    return { processed: false, reason: "Checkout is not successful yet" };
  }

  const normalizedPayload = normalizeCheckoutLookupPayload(
    rawPayload,
    paymentOption,
  );
  const parsed = parseNombaPaymentWebhook(normalizedPayload);

  if (!getProviderReference(parsed)) {
    return { processed: false, reason: "Missing checkout payment reference" };
  }

  const [storedEvent] = await db
    .insert(webhookEvents)
    .values({
      organizationId: paymentOption.organizationId,
      invoiceId: paymentOption.invoiceId,
      provider: "nomba",
      providerEventId: null,
      eventType: "checkout_requery",
      providerReference: getProviderReference(parsed),
      providerSessionId: parsed.providerSessionId,
      providerAccountId: parsed.providerAccountId,
      signatureValid: null,
      processingStatus: "verified",
      headers: {},
      rawPayload,
    })
    .returning({ id: webhookEvents.id });

  return processVerifiedNombaWebhook(storedEvent.id, normalizedPayload, db);
}
