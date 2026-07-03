import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { collectionPayers, collections, payers } from "@/db/schema";
import {
  validateCollectionInput,
  type CollectionInput,
  type ValidCollectionInput,
} from "@/lib/collections";

export class CollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionError";
  }
}

export async function listCollections(
  organizationId: number,
  filters: { query?: string; status?: string } = {},
  db = getDb(),
) {
  const search = filters.query?.trim() ?? "";
  const status = filters.status?.trim() ?? "";
  const conditions = [eq(collections.organizationId, organizationId)];

  if (search) {
    conditions.push(
      or(
        ilike(collections.name, `%${search}%`),
        ilike(collections.description, `%${search}%`),
      )!,
    );
  }

  if (status && status !== "all") {
    conditions.push(eq(collections.status, status));
  }

  const rows = await db
    .select()
    .from(collections)
    .where(and(...conditions))
    .orderBy(desc(collections.createdAt));

  if (rows.length === 0) {
    return [];
  }

  const collectionIds = rows.map((collection) => collection.id);
  const countRows = await db
    .select({
      collectionId: collectionPayers.collectionId,
      payerCount: sql<number>`count(*)::int`,
    })
    .from(collectionPayers)
    .where(
      and(
        eq(collectionPayers.organizationId, organizationId),
        inArray(collectionPayers.collectionId, collectionIds),
      ),
    )
    .groupBy(collectionPayers.collectionId);
  const payerCounts = new Map(
    countRows.map((row) => [row.collectionId, Number(row.payerCount)]),
  );

  return rows.map((collection) => ({
    ...collection,
    assignedPayerCount: payerCounts.get(collection.id) ?? 0,
  }));
}

export async function getCollectionForOrganization(
  organizationId: number,
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
    return null;
  }

  const assignedPayers = await db
    .select({
      id: payers.id,
      fullName: payers.fullName,
      email: payers.email,
      phone: payers.phone,
      externalId: payers.externalId,
    })
    .from(collectionPayers)
    .innerJoin(payers, eq(collectionPayers.payerId, payers.id))
    .where(
      and(
        eq(collectionPayers.organizationId, organizationId),
        eq(collectionPayers.collectionId, collectionId),
      ),
    )
    .orderBy(asc(payers.fullName));

  return { collection, assignedPayers };
}

async function assertPayersBelongToOrganization(
  organizationId: number,
  payerIds: number[],
  db: ReturnType<typeof getDb>,
) {
  const organizationPayers = await db
    .select({ id: payers.id })
    .from(payers)
    .where(
      and(
        eq(payers.organizationId, organizationId),
        inArray(payers.id, payerIds),
      ),
    );
  const foundIds = new Set(organizationPayers.map((payer) => payer.id));

  if (foundIds.size !== payerIds.length) {
    throw new CollectionError(
      "Select only payers that belong to this organization.",
    );
  }
}

function isValidCollectionInput(
  input: CollectionInput | ValidCollectionInput,
): input is ValidCollectionInput {
  return "amountKobo" in input;
}

export async function createDraftCollection(
  organizationId: number,
  userId: number,
  input: CollectionInput | ValidCollectionInput,
  db = getDb(),
) {
  const validation = isValidCollectionInput(input)
    ? ({ ok: true, data: input } as const)
    : validateCollectionInput(input);

  if (!validation.ok) {
    throw new CollectionError("Collection input is invalid.");
  }

  await assertPayersBelongToOrganization(
    organizationId,
    validation.data.payerIds,
    db,
  );

  const [collection] = await db
    .insert(collections)
    .values({
      organizationId,
      name: validation.data.name,
      description: validation.data.description,
      amountKobo: validation.data.amountKobo,
      currency: "NGN",
      dueDate: validation.data.dueDate,
      status: "draft",
      createdByUserId: userId,
    })
    .returning();

  await db.insert(collectionPayers).values(
    validation.data.payerIds.map((payerId) => ({
      organizationId,
      collectionId: collection.id,
      payerId,
    })),
  );

  return collection;
}
