import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { formatPaymentMethodLabel } from "@/server/payment-records";
import {
  collections,
  invoices,
  payers,
  payments,
  reconciliationEvents,
} from "@/db/schema";

export type DashboardMetricInput = {
  totalDueKobo: number;
  totalPaidKobo: number;
  outstandingKobo: number;
  openInvoiceCount: number;
  dueTodayCount: number;
  todayPaymentKobo: number;
  pendingReconciliationCount: number;
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardOutstandingCollection = {
  id: number;
  name: string;
  outstandingKobo: number;
  openInvoiceCount: number;
  collectionRate: number;
};

export type DashboardActivity = {
  title: string;
  detail: string;
  time: string;
};

export type DashboardReconciliationItem = {
  label: string;
  value: number;
  status: "good" | "warn" | "danger";
};

export type DashboardData = {
  metrics: DashboardMetric[];
  outstandingCollections: DashboardOutstandingCollection[];
  reconciliation: DashboardReconciliationItem[];
  activity: DashboardActivity[];
};

function numberFrom(value: unknown) {
  return Number(value ?? 0);
}

export function calculateCollectionRate(
  totalDueKobo: number,
  totalPaidKobo: number,
) {
  if (totalDueKobo <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((totalPaidKobo / totalDueKobo) * 100));
}

export function getLagosDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getLagosDayBounds(date = new Date()) {
  const dateKey = getLagosDateKey(date);
  const start = new Date(`${dateKey}T00:00:00+01:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { dateKey, start, end };
}

function formatCompactNaira(amountKobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: amountKobo >= 1_000_000_00 ? 1 : 0,
  }).format(amountKobo / 100);
}

function formatActivityTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function buildDashboardMetrics(
  input: DashboardMetricInput,
): DashboardMetric[] {
  const collectionRate = calculateCollectionRate(
    input.totalDueKobo,
    input.totalPaidKobo,
  );
  const remainingRate = Math.max(0, 100 - collectionRate);

  return [
    {
      label: "Outstanding Collections",
      value: formatCompactNaira(input.outstandingKobo),
      helper: `${input.openInvoiceCount} open invoice${input.openInvoiceCount === 1 ? "" : "s"}`,
    },
    {
      label: "Collection Rate",
      value: `${collectionRate}%`,
      helper:
        input.totalDueKobo > 0
          ? `${remainingRate}% left to collect`
          : "No invoices sent yet",
    },
    {
      label: "Invoices Due Today",
      value: String(input.dueTodayCount),
      helper:
        input.dueTodayCount > 0
          ? "Needs same-day follow-up"
          : "No invoice due today",
    },
    {
      label: "Recent Payments",
      value: formatCompactNaira(input.todayPaymentKobo),
      helper: "Received today",
    },
    {
      label: "Pending Reconciliation",
      value: String(input.pendingReconciliationCount),
      helper:
        input.pendingReconciliationCount > 0
          ? "Needs finance review"
          : "No exceptions open",
    },
  ];
}

export async function getDashboardData(
  organizationId: number,
  db = getDb(),
): Promise<DashboardData> {
  const { dateKey, start, end } = getLagosDayBounds();

  const [
    overviewRows,
    dueTodayRows,
    todayPaymentRows,
    collectionRows,
    activityRows,
    reconciliationRows,
  ] = await Promise.all([
    db
      .select({
        totalDueKobo: sql<number>`coalesce(sum(${invoices.amountDueKobo}), 0)::int`,
        totalPaidKobo: sql<number>`coalesce(sum(${invoices.amountPaidKobo}), 0)::int`,
        outstandingKobo: sql<number>`coalesce(sum(greatest(${invoices.amountDueKobo} - ${invoices.amountPaidKobo}, 0)), 0)::int`,
        openInvoiceCount: sql<number>`count(*) filter (where ${invoices.status} not in ('paid', 'cancelled'))::int`,
      })
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.dueDate, dateKey),
          sql`${invoices.status} not in ('paid', 'cancelled')`,
        ),
      ),
    db
      .select({
        amountKobo: sql<number>`coalesce(sum(${payments.amountKobo}), 0)::int`,
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
        id: collections.id,
        name: collections.name,
        totalDueKobo: sql<number>`coalesce(sum(${invoices.amountDueKobo}), 0)::int`,
        totalPaidKobo: sql<number>`coalesce(sum(${invoices.amountPaidKobo}), 0)::int`,
        outstandingKobo: sql<number>`coalesce(sum(greatest(${invoices.amountDueKobo} - ${invoices.amountPaidKobo}, 0)), 0)::int`,
        openInvoiceCount: sql<number>`count(*) filter (where ${invoices.status} not in ('paid', 'cancelled'))::int`,
      })
      .from(collections)
      .innerJoin(invoices, eq(invoices.collectionId, collections.id))
      .where(eq(collections.organizationId, organizationId))
      .groupBy(collections.id, collections.name)
      .orderBy(
        desc(
          sql`coalesce(sum(greatest(${invoices.amountDueKobo} - ${invoices.amountPaidKobo}, 0)), 0)`,
        ),
      )
      .limit(6),
    db
      .select({
        amountKobo: payments.amountKobo,
        paidAt: payments.paidAt,
        paymentMethod: payments.paymentMethod,
        invoiceNumber: invoices.invoiceNumber,
        payerName: payers.fullName,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(payers, eq(payments.payerId, payers.id))
      .where(eq(payments.organizationId, organizationId))
      .orderBy(desc(payments.paidAt))
      .limit(5),
    db
      .select({
        reconciliationStatus: reconciliationEvents.reconciliationStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(reconciliationEvents)
      .where(eq(reconciliationEvents.organizationId, organizationId))
      .groupBy(reconciliationEvents.reconciliationStatus),
  ]);

  const overview = overviewRows[0];
  const reconciliationCounts = new Map(
    reconciliationRows.map((row) => [
      row.reconciliationStatus,
      numberFrom(row.count),
    ]),
  );
  const pendingReconciliationCount = reconciliationRows.reduce((total, row) => {
    return row.reconciliationStatus === "matched_automatically"
      ? total
      : total + numberFrom(row.count);
  }, 0);

  return {
    metrics: buildDashboardMetrics({
      totalDueKobo: numberFrom(overview?.totalDueKobo),
      totalPaidKobo: numberFrom(overview?.totalPaidKobo),
      outstandingKobo: numberFrom(overview?.outstandingKobo),
      openInvoiceCount: numberFrom(overview?.openInvoiceCount),
      dueTodayCount: numberFrom(dueTodayRows[0]?.count),
      todayPaymentKobo: numberFrom(todayPaymentRows[0]?.amountKobo),
      pendingReconciliationCount,
    }),
    outstandingCollections: collectionRows
      .map((row) => ({
        id: row.id,
        name: row.name,
        outstandingKobo: numberFrom(row.outstandingKobo),
        openInvoiceCount: numberFrom(row.openInvoiceCount),
        collectionRate: calculateCollectionRate(
          numberFrom(row.totalDueKobo),
          numberFrom(row.totalPaidKobo),
        ),
      }))
      .filter((collection) => collection.outstandingKobo > 0)
      .slice(0, 3),
    reconciliation: [
      {
        label: "Matched Automatically",
        value: reconciliationCounts.get("matched_automatically") ?? 0,
        status: "good",
      },
      {
        label: "Underpayments",
        value: reconciliationCounts.get("underpayment") ?? 0,
        status: "warn",
      },
      {
        label: "Overpayments",
        value: reconciliationCounts.get("overpayment") ?? 0,
        status: "warn",
      },
      {
        label: "Needs Review",
        value: pendingReconciliationCount,
        status: pendingReconciliationCount > 0 ? "danger" : "good",
      },
    ],
    activity: activityRows.map((row) => ({
      title: `${row.invoiceNumber} paid`,
      detail: `${row.payerName} paid ${formatCompactNaira(row.amountKobo)} via ${formatPaymentMethodLabel(row.paymentMethod)}`,
      time: formatActivityTime(row.paidAt),
    })),
  };
}
