import { and, asc, eq, ilike, ne, or } from "drizzle-orm";

import { getDb } from "@/db";
import { payers } from "@/db/schema";
import {
  validatePayerInput,
  type PayerInput,
  type ValidPayerInput,
} from "@/lib/payers";

export class PayerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayerError";
  }
}

function isDuplicateExternalIdError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function assertExternalIdAvailable(
  organizationId: number,
  externalId: string | null,
  db: ReturnType<typeof getDb>,
  ignoredPayerId?: number,
) {
  if (!externalId) {
    return;
  }

  const conditions = [
    eq(payers.organizationId, organizationId),
    eq(payers.externalId, externalId),
  ];

  if (ignoredPayerId) {
    conditions.push(ne(payers.id, ignoredPayerId));
  }

  const [existingPayer] = await db
    .select({ id: payers.id })
    .from(payers)
    .where(and(...conditions))
    .limit(1);

  if (existingPayer) {
    throw new PayerError("A payer with this external ID already exists.");
  }
}

export async function listPayers(
  organizationId: number,
  query = "",
  db = getDb(),
) {
  const search = query.trim();
  const whereClause = search
    ? and(
        eq(payers.organizationId, organizationId),
        or(
          ilike(payers.fullName, `%${search}%`),
          ilike(payers.email, `%${search}%`),
          ilike(payers.phone, `%${search}%`),
          ilike(payers.externalId, `%${search}%`),
        ),
      )
    : eq(payers.organizationId, organizationId);

  return db
    .select()
    .from(payers)
    .where(whereClause)
    .orderBy(asc(payers.fullName));
}

export async function getPayerForOrganization(
  organizationId: number,
  payerId: number,
  db = getDb(),
) {
  const [payer] = await db
    .select()
    .from(payers)
    .where(
      and(eq(payers.organizationId, organizationId), eq(payers.id, payerId)),
    )
    .limit(1);

  return payer ?? null;
}

export async function createPayer(
  organizationId: number,
  input: PayerInput | ValidPayerInput,
  db = getDb(),
) {
  const validation = validatePayerInput(input);

  if (!validation.ok) {
    throw new PayerError("Payer input is invalid.");
  }

  await assertExternalIdAvailable(
    organizationId,
    validation.data.externalId,
    db,
  );

  try {
    const [payer] = await db
      .insert(payers)
      .values({
        organizationId,
        fullName: validation.data.fullName,
        email: validation.data.email,
        phone: validation.data.phone,
        externalId: validation.data.externalId,
      })
      .returning();

    return payer;
  } catch (error) {
    if (isDuplicateExternalIdError(error)) {
      throw new PayerError("A payer with this external ID already exists.");
    }

    throw error;
  }
}

export async function updatePayer(
  organizationId: number,
  payerId: number,
  input: PayerInput | ValidPayerInput,
  db = getDb(),
) {
  const validation = validatePayerInput(input);

  if (!validation.ok) {
    throw new PayerError("Payer input is invalid.");
  }

  await assertExternalIdAvailable(
    organizationId,
    validation.data.externalId,
    db,
    payerId,
  );

  try {
    const [payer] = await db
      .update(payers)
      .set({
        fullName: validation.data.fullName,
        email: validation.data.email,
        phone: validation.data.phone,
        externalId: validation.data.externalId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(payers.organizationId, organizationId), eq(payers.id, payerId)),
      )
      .returning();

    if (!payer) {
      throw new PayerError("Payer was not found.");
    }

    return payer;
  } catch (error) {
    if (isDuplicateExternalIdError(error)) {
      throw new PayerError("A payer with this external ID already exists.");
    }

    throw error;
  }
}
