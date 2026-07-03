import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  collectionPayers,
  collections,
  invoicePaymentOptions,
  invoices,
  organizations,
  payers,
  payments,
  receipts,
} from "@/db/schema";
import { formatInvoiceNumber } from "@/lib/invoices";
import { createNombaCheckoutOrder } from "@/server/nomba";

export class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceError";
  }
}

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export type InvoiceRow = typeof invoices.$inferSelect;

type Db = ReturnType<typeof getDb>;

type InvoiceWithContext = InvoiceRow & {
  payer: {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    externalId: string | null;
  };
  collection: {
    id: number;
    name: string;
    status: string;
  };
};

export type PublicInvoice = InvoiceWithContext & {
  organization: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
  };
};

export type InvoiceReceipt = typeof receipts.$inferSelect & {
  payment: {
    id: number;
    providerReference: string;
    providerSessionId: string | null;
    paymentMethod: string;
    paidAt: Date;
  };
};

export type SentInvoice = InvoiceWithContext & {
  publicPath: string;
  wasCreated: boolean;
};

export type CheckoutClient = typeof createNombaCheckoutOrder;

function getInvoiceYear(dueDate: string | Date) {
  if (dueDate instanceof Date) {
    return dueDate.getFullYear();
  }

  return dueDate.slice(0, 4);
}

function invoiceFromRow(row: {
  invoice: InvoiceRow;
  payer: InvoiceWithContext["payer"];
  collection: InvoiceWithContext["collection"];
}): InvoiceWithContext {
  return {
    ...row.invoice,
    payer: row.payer,
    collection: row.collection,
  };
}

function getPublicInvoicePath(publicToken: string) {
  return `/invoice/${publicToken}`;
}

function normalizePayerIds(payerIds: number[]) {
  return [...new Set(payerIds)].filter(
    (payerId) => Number.isInteger(payerId) && payerId > 0,
  );
}

export async function listInvoices(
  organizationId: number,
  filters: {
    query?: string;
    status?: string;
    collectionId?: number;
    payerId?: number;
  } = {},
  db = getDb(),
): Promise<InvoiceWithContext[]> {
  const search = filters.query?.trim() ?? "";
  const status = filters.status?.trim() ?? "";
  const conditions = [eq(invoices.organizationId, organizationId)];

  if (search) {
    const numericSearch = Number(search);
    const searchConditions = [
      ilike(invoices.invoiceNumber, `%${search}%`),
      ilike(payers.fullName, `%${search}%`),
      ilike(collections.name, `%${search}%`),
    ];

    if (Number.isInteger(numericSearch) && numericSearch > 0) {
      searchConditions.push(eq(invoices.id, numericSearch));
    }

    conditions.push(or(...searchConditions)!);
  }

  if (status && status !== "all") {
    conditions.push(eq(invoices.status, status));
  }

  if (filters.collectionId) {
    conditions.push(eq(invoices.collectionId, filters.collectionId));
  }

  if (filters.payerId) {
    conditions.push(eq(invoices.payerId, filters.payerId));
  }

  const rows = await db
    .select({
      invoice: invoices,
      payer: {
        id: payers.id,
        fullName: payers.fullName,
        email: payers.email,
        phone: payers.phone,
        externalId: payers.externalId,
      },
      collection: {
        id: collections.id,
        name: collections.name,
        status: collections.status,
      },
    })
    .from(invoices)
    .innerJoin(payers, eq(invoices.payerId, payers.id))
    .innerJoin(collections, eq(invoices.collectionId, collections.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  return rows.map(invoiceFromRow);
}

export async function listInvoicesForCollection(
  organizationId: number,
  collectionId: number,
  db = getDb(),
): Promise<InvoiceWithContext[]> {
  const rows = await db
    .select({
      invoice: invoices,
      payer: {
        id: payers.id,
        fullName: payers.fullName,
        email: payers.email,
        phone: payers.phone,
        externalId: payers.externalId,
      },
      collection: {
        id: collections.id,
        name: collections.name,
        status: collections.status,
      },
    })
    .from(invoices)
    .innerJoin(payers, eq(invoices.payerId, payers.id))
    .innerJoin(collections, eq(invoices.collectionId, collections.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.collectionId, collectionId),
      ),
    )
    .orderBy(asc(payers.fullName));

  return rows.map(invoiceFromRow);
}

async function listInvoicesForSelectedPayers(
  organizationId: number,
  collectionId: number,
  payerIds: number[],
  db: Db,
): Promise<InvoiceWithContext[]> {
  const rows = await db
    .select({
      invoice: invoices,
      payer: {
        id: payers.id,
        fullName: payers.fullName,
        email: payers.email,
        phone: payers.phone,
        externalId: payers.externalId,
      },
      collection: {
        id: collections.id,
        name: collections.name,
        status: collections.status,
      },
    })
    .from(invoices)
    .innerJoin(payers, eq(invoices.payerId, payers.id))
    .innerJoin(collections, eq(invoices.collectionId, collections.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.collectionId, collectionId),
        inArray(invoices.payerId, payerIds),
      ),
    )
    .orderBy(asc(payers.fullName));

  return rows.map(invoiceFromRow);
}

export async function getInvoiceForOrganization(
  organizationId: number,
  invoiceId: number,
  db = getDb(),
): Promise<InvoiceWithContext | null> {
  const [row] = await db
    .select({
      invoice: invoices,
      payer: {
        id: payers.id,
        fullName: payers.fullName,
        email: payers.email,
        phone: payers.phone,
        externalId: payers.externalId,
      },
      collection: {
        id: collections.id,
        name: collections.name,
        status: collections.status,
      },
    })
    .from(invoices)
    .innerJoin(payers, eq(invoices.payerId, payers.id))
    .innerJoin(collections, eq(invoices.collectionId, collections.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.id, invoiceId),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return invoiceFromRow(row);
}

export async function getPublicInvoiceByToken(
  publicToken: string,
  db = getDb(),
): Promise<PublicInvoice | null> {
  const [row] = await db
    .select({
      invoice: invoices,
      organization: {
        id: organizations.id,
        name: organizations.name,
        email: organizations.email,
        phone: organizations.phone,
        logoUrl: organizations.logoUrl,
      },
      payer: {
        id: payers.id,
        fullName: payers.fullName,
        email: payers.email,
        phone: payers.phone,
        externalId: payers.externalId,
      },
      collection: {
        id: collections.id,
        name: collections.name,
        status: collections.status,
      },
    })
    .from(invoices)
    .innerJoin(organizations, eq(invoices.organizationId, organizations.id))
    .innerJoin(payers, eq(invoices.payerId, payers.id))
    .innerJoin(collections, eq(invoices.collectionId, collections.id))
    .where(eq(invoices.publicToken, publicToken))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row.invoice,
    organization: row.organization,
    payer: row.payer,
    collection: row.collection,
  };
}

export async function getActiveCheckoutForInvoice(
  organizationId: number,
  invoiceId: number,
  db = getDb(),
) {
  const [row] = await db
    .select()
    .from(invoicePaymentOptions)
    .where(
      and(
        eq(invoicePaymentOptions.organizationId, organizationId),
        eq(invoicePaymentOptions.invoiceId, invoiceId),
        eq(invoicePaymentOptions.optionType, "checkout"),
        eq(invoicePaymentOptions.status, "active"),
      ),
    )
    .orderBy(desc(invoicePaymentOptions.createdAt))
    .limit(1);

  return row ?? null;
}

export async function listReceiptsForInvoice(
  organizationId: number,
  invoiceId: number,
  db = getDb(),
): Promise<InvoiceReceipt[]> {
  const rows = await db
    .select({
      receipt: receipts,
      payment: {
        id: payments.id,
        providerReference: payments.providerReference,
        providerSessionId: payments.providerSessionId,
        paymentMethod: payments.paymentMethod,
        paidAt: payments.paidAt,
      },
    })
    .from(receipts)
    .innerJoin(payments, eq(receipts.paymentId, payments.id))
    .where(
      and(
        eq(receipts.organizationId, organizationId),
        eq(receipts.invoiceId, invoiceId),
      ),
    )
    .orderBy(desc(receipts.issuedAt));

  return rows.map((row) => ({
    ...row.receipt,
    payment: row.payment,
  }));
}

export async function createOrReuseCheckoutForPublicInvoice(
  publicToken: string,
  options: {
    appUrl: string;
    db?: Db;
    checkoutClient?: CheckoutClient;
  },
) {
  const db = options.db ?? getDb();
  const checkoutClient = options.checkoutClient ?? createNombaCheckoutOrder;
  const invoice = await getPublicInvoiceByToken(publicToken, db);

  if (!invoice) {
    throw new CheckoutError("Invoice was not found.");
  }

  if (invoice.status === "paid") {
    throw new CheckoutError("This invoice has already been paid.");
  }

  if (invoice.status === "cancelled") {
    throw new CheckoutError("This invoice is no longer payable.");
  }

  if (!invoice.payer.email) {
    throw new CheckoutError(
      "This payer does not have an email address for Checkout.",
    );
  }

  const outstandingKobo = Math.max(
    invoice.amountDueKobo - invoice.amountPaidKobo,
    0,
  );

  if (outstandingKobo <= 0) {
    throw new CheckoutError("This invoice has no outstanding balance.");
  }

  const existingCheckout = await getActiveCheckoutForInvoice(
    invoice.organizationId,
    invoice.id,
    db,
  );

  if (existingCheckout?.checkoutUrl) {
    return existingCheckout.checkoutUrl;
  }

  const appUrl = options.appUrl.replace(/\/$/, "");
  const callbackUrl = `${appUrl}${getPublicInvoicePath(invoice.publicToken)}`;
  const orderReference = invoice.invoiceNumber;
  const checkout = await checkoutClient({
    orderReference,
    customerId: String(invoice.payer.id),
    customerEmail: invoice.payer.email,
    amountKobo: outstandingKobo,
    currency: invoice.currency,
    callbackUrl,
    metadata: {
      organizationId: String(invoice.organizationId),
      organizationName: invoice.organization.name,
      collectionId: String(invoice.collectionId),
      collectionName: invoice.collection.name,
      invoiceId: String(invoice.id),
      invoiceNumber: invoice.invoiceNumber,
      payerId: String(invoice.payer.id),
      payerName: invoice.payer.fullName,
    },
  });

  await db.insert(invoicePaymentOptions).values({
    organizationId: invoice.organizationId,
    invoiceId: invoice.id,
    provider: "nomba",
    optionType: "checkout",
    providerReference: checkout.orderReference,
    orderReference: checkout.orderReference,
    checkoutStatus: "created",
    checkoutUrl: checkout.checkoutLink,
    expectedAmountKobo: outstandingKobo,
    currency: invoice.currency,
    status: "active",
    customerId: String(invoice.payer.id),
    customerEmail: invoice.payer.email,
    callbackUrl,
    successUrl: callbackUrl,
    rawProviderResponse: checkout.rawResponse ?? {},
  });

  return checkout.checkoutLink;
}

export async function sendInvoicesForSelectedPayers(
  organizationId: number,
  organizationName: string,
  collectionId: number,
  payerIds: number[],
  db = getDb(),
): Promise<SentInvoice[]> {
  const selectedPayerIds = normalizePayerIds(payerIds);

  if (selectedPayerIds.length === 0) {
    throw new InvoiceError(
      "Select at least one payer before sending invoices.",
    );
  }

  const [collection] = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.organizationId, organizationId),
        eq(collections.id, collectionId),
      ),
    )
    .limit(1);

  if (!collection) {
    throw new InvoiceError("Collection was not found.");
  }

  if (!["draft", "active"].includes(collection.status)) {
    throw new InvoiceError("Invoices can only be sent for open collections.");
  }

  const assignments = await db
    .select({
      assignmentId: collectionPayers.id,
      payerId: collectionPayers.payerId,
      payer: {
        id: payers.id,
        fullName: payers.fullName,
        email: payers.email,
        phone: payers.phone,
        externalId: payers.externalId,
      },
    })
    .from(collectionPayers)
    .innerJoin(payers, eq(collectionPayers.payerId, payers.id))
    .where(
      and(
        eq(collectionPayers.organizationId, organizationId),
        eq(collectionPayers.collectionId, collectionId),
        inArray(collectionPayers.payerId, selectedPayerIds),
      ),
    )
    .orderBy(asc(payers.fullName));

  if (assignments.length !== selectedPayerIds.length) {
    throw new InvoiceError("Select only payers assigned to this collection.");
  }

  const existingInvoices = await db
    .select({ payerId: invoices.payerId })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.collectionId, collectionId),
        inArray(invoices.payerId, selectedPayerIds),
      ),
    );
  const existingPayerIds = new Set(
    existingInvoices.map((invoice) => invoice.payerId),
  );
  const missingAssignments = assignments.filter(
    (assignment) => !existingPayerIds.has(assignment.payerId),
  );

  if (missingAssignments.length > 0) {
    await db.insert(invoices).values(
      missingAssignments.map((assignment) => ({
        organizationId,
        collectionId,
        payerId: assignment.payerId,
        invoiceNumber: formatInvoiceNumber({
          organizationName,
          payerName: assignment.payer.fullName,
          payerExternalId: assignment.payer.externalId,
          year: getInvoiceYear(collection.dueDate),
          serial: assignment.assignmentId,
        }),
        amountDueKobo: collection.amountKobo,
        amountPaidKobo: 0,
        currency: collection.currency,
        dueDate: collection.dueDate,
        status: "pending",
      })),
    );
  }

  if (collection.status === "draft" && missingAssignments.length > 0) {
    await db
      .update(collections)
      .set({ status: "active", updatedAt: new Date() })
      .where(
        and(
          eq(collections.organizationId, organizationId),
          eq(collections.id, collectionId),
        ),
      );
  }

  const createdPayerIds = new Set(
    missingAssignments.map((assignment) => assignment.payerId),
  );
  const sentInvoices = await listInvoicesForSelectedPayers(
    organizationId,
    collectionId,
    selectedPayerIds,
    db,
  );

  return sentInvoices.map((invoice) => ({
    ...invoice,
    publicPath: getPublicInvoicePath(invoice.publicToken),
    wasCreated: createdPayerIds.has(invoice.payerId),
  }));
}

export async function generateInvoicesForCollection(
  organizationId: number,
  organizationName: string,
  collectionId: number,
  db = getDb(),
) {
  const assignments = await db
    .select({ payerId: collectionPayers.payerId })
    .from(collectionPayers)
    .where(
      and(
        eq(collectionPayers.organizationId, organizationId),
        eq(collectionPayers.collectionId, collectionId),
      ),
    );

  return sendInvoicesForSelectedPayers(
    organizationId,
    organizationName,
    collectionId,
    assignments.map((assignment) => assignment.payerId),
    db,
  );
}

export async function getInvoiceStatsForCollection(
  organizationId: number,
  collectionId: number,
  db = getDb(),
) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      amountDueKobo: sql<number>`coalesce(sum(${invoices.amountDueKobo}), 0)::int`,
      amountPaidKobo: sql<number>`coalesce(sum(${invoices.amountPaidKobo}), 0)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.collectionId, collectionId),
      ),
    );

  return {
    count: Number(row?.count ?? 0),
    amountDueKobo: Number(row?.amountDueKobo ?? 0),
    amountPaidKobo: Number(row?.amountPaidKobo ?? 0),
  };
}
