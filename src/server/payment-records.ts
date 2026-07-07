import { and, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  collections,
  invoices,
  payers,
  payments,
  receipts,
  reconciliationEvents,
} from "@/db/schema";
import { formatKoboAsNaira } from "@/lib/money";

type Db = ReturnType<typeof getDb>;

export type PaymentFilters = {
  query?: string;
  method?: string;
  status?: string;
};

export type PaymentOverviewInput = {
  totalReceivedKobo: number;
  totalPaymentCount: number;
  todayReceivedKobo: number;
  todayPaymentCount: number;
  verifiedPaymentCount: number;
  needsReviewCount: number;
};

export type PaymentOverviewCard = {
  label: string;
  value: string;
  helper: string;
};

export type PaymentRecord = {
  id: number;
  amountKobo: number;
  currency: string;
  paymentMethod: string;
  providerReference: string;
  providerSessionId: string | null;
  providerStatus: string;
  verificationStatus: string;
  paidAt: Date;
  invoice: {
    id: number;
    invoiceNumber: string;
    publicToken: string;
    status: string;
  };
  payer: {
    id: number;
    fullName: string;
    email: string | null;
    externalId: string | null;
  };
  collection: {
    id: number;
    name: string;
  };
  receipt: {
    id: number;
    receiptNumber: string;
    amountKobo: number;
    currency: string;
    issuedAt: Date;
  } | null;
};

function numberFrom(value: unknown) {
  return Number(value ?? 0);
}

function getLagosDayBounds(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const dateKey = `${values.year}-${values.month}-${values.day}`;
  const start = new Date(`${dateKey}T00:00:00+01:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function formatPaymentMethodLabel(method: string) {
  const normalized = method.trim().toLowerCase().replaceAll("-", "_");

  if (
    normalized === "card" ||
    normalized === "checkout_card" ||
    normalized === "checkout card"
  ) {
    return "Card";
  }

  if (
    normalized === "transfer" ||
    normalized === "bank_transfer" ||
    normalized === "checkout_transfer" ||
    normalized === "checkout transfer"
  ) {
    return "Transfer";
  }

  if (normalized === "checkout") {
    return "Checkout";
  }

  if (!normalized || normalized === "unknown") {
    return "Unknown";
  }

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildPaymentOverview(
  input: PaymentOverviewInput,
): PaymentOverviewCard[] {
  return [
    {
      label: "Total Received",
      value: formatKoboAsNaira(input.totalReceivedKobo),
      helper: `${input.totalPaymentCount} payment${input.totalPaymentCount === 1 ? "" : "s"}`,
    },
    {
      label: "Received Today",
      value: formatKoboAsNaira(input.todayReceivedKobo),
      helper: `${input.todayPaymentCount} payment${input.todayPaymentCount === 1 ? "" : "s"} today`,
    },
    {
      label: "Verified Payments",
      value: String(input.verifiedPaymentCount),
      helper: "Confirmed through Nomba",
    },
    {
      label: "Needs Review",
      value: String(input.needsReviewCount),
      helper:
        input.needsReviewCount > 0
          ? "Check failed or pending records"
          : "No exceptions open",
    },
  ];
}

function getPaymentConditions(organizationId: number, filters: PaymentFilters) {
  const conditions = [eq(payments.organizationId, organizationId)];
  const query = filters.query?.trim();

  if (query) {
    const search = `%${query}%`;
    const numericQuery = Number(query);
    const searchConditions = [
      ilike(invoices.invoiceNumber, search),
      ilike(payers.fullName, search),
      ilike(payers.email, search),
      ilike(payers.externalId, search),
      ilike(collections.name, search),
      ilike(payments.providerReference, search),
    ];

    if (Number.isInteger(numericQuery) && numericQuery > 0) {
      searchConditions.push(eq(payments.id, numericQuery));
    }

    conditions.push(or(...searchConditions)!);
  }

  if (filters.method && filters.method !== "all") {
    if (filters.method === "card") {
      conditions.push(
        or(
          eq(payments.paymentMethod, "card"),
          eq(payments.paymentMethod, "checkout_card"),
        )!,
      );
    } else if (filters.method === "transfer") {
      conditions.push(
        or(
          eq(payments.paymentMethod, "transfer"),
          eq(payments.paymentMethod, "bank_transfer"),
          eq(payments.paymentMethod, "checkout_transfer"),
        )!,
      );
    } else {
      conditions.push(eq(payments.paymentMethod, filters.method));
    }
  }

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(payments.verificationStatus, filters.status));
  }

  return and(...conditions);
}

export async function getPaymentOverview(organizationId: number, db = getDb()) {
  const { start, end } = getLagosDayBounds();
  const [summaryRows, todayRows, reviewRows] = await Promise.all([
    db
      .select({
        totalReceivedKobo: sql<number>`coalesce(sum(${payments.amountKobo}), 0)::int`,
        totalPaymentCount: sql<number>`count(*)::int`,
        verifiedPaymentCount: sql<number>`count(*) filter (where ${payments.verificationStatus} = 'verified')::int`,
        paymentExceptionCount: sql<number>`count(*) filter (where ${payments.verificationStatus} <> 'verified' or ${payments.providerStatus} <> 'success')::int`,
      })
      .from(payments)
      .where(eq(payments.organizationId, organizationId)),
    db
      .select({
        todayReceivedKobo: sql<number>`coalesce(sum(${payments.amountKobo}), 0)::int`,
        todayPaymentCount: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          gte(payments.paidAt, start),
          lt(payments.paidAt, end),
        ),
      ),
    db
      .select({
        reconciliationExceptionCount: sql<number>`count(*) filter (where ${reconciliationEvents.reconciliationStatus} <> 'matched_automatically')::int`,
      })
      .from(reconciliationEvents)
      .where(eq(reconciliationEvents.organizationId, organizationId)),
  ]);

  return buildPaymentOverview({
    totalReceivedKobo: numberFrom(summaryRows[0]?.totalReceivedKobo),
    totalPaymentCount: numberFrom(summaryRows[0]?.totalPaymentCount),
    verifiedPaymentCount: numberFrom(summaryRows[0]?.verifiedPaymentCount),
    needsReviewCount:
      numberFrom(summaryRows[0]?.paymentExceptionCount) +
      numberFrom(reviewRows[0]?.reconciliationExceptionCount),
    todayReceivedKobo: numberFrom(todayRows[0]?.todayReceivedKobo),
    todayPaymentCount: numberFrom(todayRows[0]?.todayPaymentCount),
  });
}

export async function listPaymentRecords(
  organizationId: number,
  filters: PaymentFilters = {},
  db: Db = getDb(),
): Promise<PaymentRecord[]> {
  const rows = await db
    .select({
      id: payments.id,
      amountKobo: payments.amountKobo,
      currency: payments.currency,
      paymentMethod: payments.paymentMethod,
      providerReference: payments.providerReference,
      providerSessionId: payments.providerSessionId,
      providerStatus: payments.providerStatus,
      verificationStatus: payments.verificationStatus,
      paidAt: payments.paidAt,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoicePublicToken: invoices.publicToken,
      invoiceStatus: invoices.status,
      payerId: payers.id,
      payerFullName: payers.fullName,
      payerEmail: payers.email,
      payerExternalId: payers.externalId,
      collectionId: collections.id,
      collectionName: collections.name,
      receiptId: receipts.id,
      receiptNumber: receipts.receiptNumber,
      receiptAmountKobo: receipts.amountKobo,
      receiptCurrency: receipts.currency,
      receiptIssuedAt: receipts.issuedAt,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(payers, eq(payments.payerId, payers.id))
    .innerJoin(collections, eq(payments.collectionId, collections.id))
    .leftJoin(receipts, eq(receipts.paymentId, payments.id))
    .where(getPaymentConditions(organizationId, filters))
    .orderBy(desc(payments.paidAt), desc(payments.id))
    .limit(100);

  return rows.map((row) => ({
    id: row.id,
    amountKobo: row.amountKobo,
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    providerReference: row.providerReference,
    providerSessionId: row.providerSessionId,
    providerStatus: row.providerStatus,
    verificationStatus: row.verificationStatus,
    paidAt: row.paidAt,
    invoice: {
      id: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
      publicToken: row.invoicePublicToken,
      status: row.invoiceStatus,
    },
    payer: {
      id: row.payerId,
      fullName: row.payerFullName,
      email: row.payerEmail,
      externalId: row.payerExternalId,
    },
    collection: {
      id: row.collectionId,
      name: row.collectionName,
    },
    receipt: row.receiptId
      ? {
          id: row.receiptId,
          receiptNumber: row.receiptNumber!,
          amountKobo: row.receiptAmountKobo!,
          currency: row.receiptCurrency!,
          issuedAt: row.receiptIssuedAt!,
        }
      : null,
  }));
}
