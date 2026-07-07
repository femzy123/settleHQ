import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { collections, invoices, payments, receipts } from "@/db/schema";

type Db = ReturnType<typeof getDb>;

export type PayerInvoiceRecord = {
  id: number;
  invoiceNumber: string;
  publicToken: string;
  amountDueKobo: number;
  amountPaidKobo: number;
  currency: string;
  dueDate: string;
  status: string;
  createdAt: Date;
  collection: {
    id: number;
    name: string;
    status: string;
  };
};

export type PayerPaymentHistoryRecord = {
  id: number;
  amountKobo: number;
  currency: string;
  paymentMethod: string;
  providerReference: string;
  providerStatus: string;
  verificationStatus: string;
  paidAt: Date;
  invoice: {
    id: number;
    invoiceNumber: string;
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

export type PayerSummaryInput = {
  totalInvoicedKobo: number;
  totalPaidKobo: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  paymentCount: number;
};

export type PayerSummary = PayerSummaryInput & {
  outstandingKobo: number;
};

export type PayerDetailData = {
  summary: PayerSummary;
  invoices: PayerInvoiceRecord[];
  payments: PayerPaymentHistoryRecord[];
};

function numberFrom(value: unknown) {
  return Number(value ?? 0);
}

export function buildPayerSummary(input: PayerSummaryInput): PayerSummary {
  return {
    ...input,
    outstandingKobo: Math.max(input.totalInvoicedKobo - input.totalPaidKobo, 0),
  };
}

function buildSummaryFromInvoices(
  invoicesForPayer: Pick<
    PayerInvoiceRecord,
    "amountDueKobo" | "amountPaidKobo" | "status"
  >[],
  paymentCount: number,
) {
  const totals = invoicesForPayer.reduce(
    (summary, invoice) => {
      const outstandingKobo = Math.max(
        invoice.amountDueKobo - invoice.amountPaidKobo,
        0,
      );

      return {
        totalInvoicedKobo: summary.totalInvoicedKobo + invoice.amountDueKobo,
        totalPaidKobo: summary.totalPaidKobo + invoice.amountPaidKobo,
        invoiceCount: summary.invoiceCount + 1,
        paidInvoiceCount:
          summary.paidInvoiceCount +
          (invoice.status === "paid" || outstandingKobo === 0 ? 1 : 0),
      };
    },
    {
      totalInvoicedKobo: 0,
      totalPaidKobo: 0,
      invoiceCount: 0,
      paidInvoiceCount: 0,
    },
  );

  return buildPayerSummary({
    ...totals,
    paymentCount,
  });
}

export async function getPayerDetailData(
  organizationId: number,
  payerId: number,
  db: Db = getDb(),
): Promise<PayerDetailData> {
  const [invoiceRows, paymentRows] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        publicToken: invoices.publicToken,
        amountDueKobo: invoices.amountDueKobo,
        amountPaidKobo: invoices.amountPaidKobo,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        status: invoices.status,
        createdAt: invoices.createdAt,
        collectionId: collections.id,
        collectionName: collections.name,
        collectionStatus: collections.status,
      })
      .from(invoices)
      .innerJoin(collections, eq(invoices.collectionId, collections.id))
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.payerId, payerId),
        ),
      )
      .orderBy(
        desc(
          sql`greatest(${invoices.amountDueKobo} - ${invoices.amountPaidKobo}, 0)`,
        ),
        desc(invoices.createdAt),
      ),
    db
      .select({
        id: payments.id,
        amountKobo: payments.amountKobo,
        currency: payments.currency,
        paymentMethod: payments.paymentMethod,
        providerReference: payments.providerReference,
        providerStatus: payments.providerStatus,
        verificationStatus: payments.verificationStatus,
        paidAt: payments.paidAt,
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
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
      .innerJoin(collections, eq(payments.collectionId, collections.id))
      .leftJoin(receipts, eq(receipts.paymentId, payments.id))
      .where(
        and(
          eq(payments.organizationId, organizationId),
          eq(payments.payerId, payerId),
        ),
      )
      .orderBy(desc(payments.paidAt), desc(payments.id)),
  ]);

  const payerInvoices = invoiceRows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    publicToken: row.publicToken,
    amountDueKobo: numberFrom(row.amountDueKobo),
    amountPaidKobo: numberFrom(row.amountPaidKobo),
    currency: row.currency,
    dueDate: row.dueDate,
    status: row.status,
    createdAt: row.createdAt,
    collection: {
      id: row.collectionId,
      name: row.collectionName,
      status: row.collectionStatus,
    },
  }));

  return {
    summary: buildSummaryFromInvoices(payerInvoices, paymentRows.length),
    invoices: payerInvoices,
    payments: paymentRows.map((row) => ({
      id: row.id,
      amountKobo: numberFrom(row.amountKobo),
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      providerReference: row.providerReference,
      providerStatus: row.providerStatus,
      verificationStatus: row.verificationStatus,
      paidAt: row.paidAt,
      invoice: {
        id: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
      },
      collection: {
        id: row.collectionId,
        name: row.collectionName,
      },
      receipt: row.receiptId
        ? {
            id: row.receiptId,
            receiptNumber: row.receiptNumber!,
            amountKobo: numberFrom(row.receiptAmountKobo),
            currency: row.receiptCurrency!,
            issuedAt: row.receiptIssuedAt!,
          }
        : null,
    })),
  };
}
