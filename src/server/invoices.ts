import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { collectionPayers, collections, invoices, payers } from "@/db/schema";
import { formatInvoiceNumber } from "@/lib/invoices";

export class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceError";
  }
}

export type InvoiceRow = typeof invoices.$inferSelect;

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

function getInvoiceYear(dueDate: string | Date) {
  if (dueDate instanceof Date) {
    return dueDate.getFullYear();
  }

  return dueDate.slice(0, 4);
}

export async function listInvoices(
  organizationId: number,
  filters: { query?: string; status?: string } = {},
  db = getDb(),
): Promise<InvoiceWithContext[]> {
  const search = filters.query?.trim() ?? "";
  const status = filters.status?.trim() ?? "";
  const conditions = [eq(invoices.organizationId, organizationId)];

  if (search) {
    conditions.push(
      or(
        ilike(invoices.invoiceNumber, `%${search}%`),
        ilike(payers.fullName, `%${search}%`),
        ilike(collections.name, `%${search}%`),
      )!,
    );
  }

  if (status && status !== "all") {
    conditions.push(eq(invoices.status, status));
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

  return rows.map((row) => ({
    ...row.invoice,
    payer: row.payer,
    collection: row.collection,
  }));
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

  return rows.map((row) => ({
    ...row.invoice,
    payer: row.payer,
    collection: row.collection,
  }));
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

  return { ...row.invoice, payer: row.payer, collection: row.collection };
}

export async function generateInvoicesForCollection(
  organizationId: number,
  organizationName: string,
  collectionId: number,
  db = getDb(),
) {
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
    throw new InvoiceError(
      "Invoices can only be generated for draft collections.",
    );
  }

  const assignments = await db
    .select({
      assignmentId: collectionPayers.id,
      payerId: collectionPayers.payerId,
    })
    .from(collectionPayers)
    .where(
      and(
        eq(collectionPayers.organizationId, organizationId),
        eq(collectionPayers.collectionId, collectionId),
      ),
    )
    .orderBy(asc(collectionPayers.id));

  if (assignments.length === 0) {
    throw new InvoiceError(
      "Assign at least one payer before generating invoices.",
    );
  }

  const existingInvoices = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.collectionId, collectionId),
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

  if (collection.status === "draft") {
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

  return listInvoicesForCollection(organizationId, collectionId, db);
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
