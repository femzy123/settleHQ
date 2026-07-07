import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { payerVirtualAccounts, payers } from "@/db/schema";
import { buildPayerAccountRef } from "@/lib/nomba-virtual-account";
import {
  createNombaVirtualAccount,
  findNombaVirtualAccountByRef,
} from "@/server/nomba";

export class VirtualAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VirtualAccountError";
  }
}

type Db = ReturnType<typeof getDb>;
type VirtualAccountClient = typeof createNombaVirtualAccount;
type VirtualAccountLookupClient = typeof findNombaVirtualAccountByRef;

export function safeAccountName(organizationName: string, payerName: string) {
  const cleaned = `${organizationName} ${payerName}`
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64)
    .trim();

  if (cleaned.length >= 8) {
    return cleaned;
  }

  return `${cleaned} Payer`.trim().padEnd(8, "0").slice(0, 64);
}

function getErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: "Unknown error" };
  }

  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown error",
    status: "status" in error ? (error as { status?: unknown }).status : undefined,
    response:
      "response" in error ? (error as { response?: unknown }).response : undefined,
  };
}

export async function getActivePayerVirtualAccount(
  organizationId: number,
  payerId: number,
  db: Db = getDb(),
) {
  const [account] = await db
    .select()
    .from(payerVirtualAccounts)
    .where(
      and(
        eq(payerVirtualAccounts.organizationId, organizationId),
        eq(payerVirtualAccounts.payerId, payerId),
        eq(payerVirtualAccounts.provider, "nomba"),
        eq(payerVirtualAccounts.status, "active"),
      ),
    )
    .limit(1);

  return account ?? null;
}

export async function getOrCreatePayerVirtualAccount(input: {
  organizationId: number;
  organizationName: string;
  payerId: number;
  db?: Db;
  client?: VirtualAccountClient;
  lookupClient?: VirtualAccountLookupClient;
}) {
  const db = input.db ?? getDb();
  const accountRef = buildPayerAccountRef(input.organizationId, input.payerId);

  console.info("[SettleHQ VA] getOrCreate started", {
    organizationId: input.organizationId,
    payerId: input.payerId,
    accountRef,
  });

  const [existing] = await db
    .select()
    .from(payerVirtualAccounts)
    .where(
      and(
        eq(payerVirtualAccounts.organizationId, input.organizationId),
        eq(payerVirtualAccounts.payerId, input.payerId),
        eq(payerVirtualAccounts.provider, "nomba"),
      ),
    )
    .limit(1);

  if (existing) {
    console.info("[SettleHQ VA] existing local account found", {
      id: existing.id,
      organizationId: existing.organizationId,
      payerId: existing.payerId,
      status: existing.status,
      accountRef: existing.accountRef,
      hasAccountNumber: Boolean(existing.accountNumber),
      bankName: existing.bankName,
    });
  }

  if (existing?.status === "active") {
    return existing;
  }

  const [payer] = await db
    .select()
    .from(payers)
    .where(
      and(
        eq(payers.organizationId, input.organizationId),
        eq(payers.id, input.payerId),
      ),
    )
    .limit(1);

  if (!payer) {
    console.error("[SettleHQ VA] payer not found", {
      organizationId: input.organizationId,
      payerId: input.payerId,
    });
    throw new VirtualAccountError("Payer was not found.");
  }

  const baseValues = {
    organizationId: input.organizationId,
    payerId: input.payerId,
    provider: "nomba",
    providerVirtualAccountId: null,
    providerAccountId: null,
    accountRef,
    accountNumber: existing?.accountNumber ?? `pending-${accountRef}`,
    accountName: safeAccountName(input.organizationName, payer.fullName),
    bankName: null,
    bankCode: null,
    currency: "NGN",
    assignmentType: "dedicated",
    status: "pending",
    rawProviderResponse: {},
  } satisfies typeof payerVirtualAccounts.$inferInsert;

  const client = input.client ?? createNombaVirtualAccount;
  const lookupClient = input.lookupClient ?? findNombaVirtualAccountByRef;

  try {
    console.info("[SettleHQ VA] creating Nomba virtual account", {
      organizationId: input.organizationId,
      payerId: input.payerId,
      accountRef,
      accountName: baseValues.accountName,
    });

    const account = await client({
      accountRef,
      accountName: baseValues.accountName ?? payer.fullName,
    });

    console.info("[SettleHQ VA] Nomba virtual account normalized", {
      organizationId: input.organizationId,
      payerId: input.payerId,
      accountRef: account.accountRef ?? accountRef,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      providerVirtualAccountId: account.providerVirtualAccountId,
    });

    const writeValues = {
      ...baseValues,
      providerVirtualAccountId: account.providerVirtualAccountId,
      accountNumber: account.accountNumber,
      accountName: account.accountName ?? baseValues.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountRef: account.accountRef ?? accountRef,
      status: "active",
      rawProviderResponse: account.raw,
    } satisfies typeof payerVirtualAccounts.$inferInsert;

    if (existing) {
      const [updated] = await db
        .update(payerVirtualAccounts)
        .set({ ...writeValues, updatedAt: new Date() })
        .where(eq(payerVirtualAccounts.id, existing.id))
        .returning();

      console.info("[SettleHQ VA] updated local virtual account", {
        id: updated.id,
        status: updated.status,
        accountRef: updated.accountRef,
        accountNumber: updated.accountNumber,
      });

      return updated;
    }

    const [created] = await db
      .insert(payerVirtualAccounts)
      .values(writeValues)
      .returning();

    console.info("[SettleHQ VA] inserted local virtual account", {
      id: created.id,
      status: created.status,
      accountRef: created.accountRef,
      accountNumber: created.accountNumber,
    });

    return created;
  } catch (error) {
    const errorDetails = getErrorDetails(error);

    console.error("[SettleHQ VA] virtual account creation failed", {
      organizationId: input.organizationId,
      payerId: input.payerId,
      accountRef,
      error: errorDetails,
    });

    const responseDescription =
      errorDetails.response &&
      typeof errorDetails.response === "object" &&
      "description" in errorDetails.response
        ? String(
            (errorDetails.response as { description?: unknown }).description ?? "",
          )
        : "";
    const responseMessage =
      errorDetails.response &&
      typeof errorDetails.response === "object" &&
      "message" in errorDetails.response
        ? String((errorDetails.response as { message?: unknown }).message ?? "")
        : "";
    const duplicateMessage =
      `${responseDescription} ${responseMessage}`.toLowerCase();

    if (duplicateMessage.includes("same accountref already exists")) {
      const existingNombaAccount = await lookupClient(accountRef);

      if (existingNombaAccount) {
        const recoveredValues = {
          ...baseValues,
          providerVirtualAccountId:
            existingNombaAccount.providerVirtualAccountId,
          accountNumber: existingNombaAccount.accountNumber,
          accountName: existingNombaAccount.accountName ?? baseValues.accountName,
          bankName: existingNombaAccount.bankName,
          bankCode: existingNombaAccount.bankCode,
          accountRef: existingNombaAccount.accountRef ?? accountRef,
          status: "active",
          rawProviderResponse: existingNombaAccount.raw,
        } satisfies typeof payerVirtualAccounts.$inferInsert;

        if (existing) {
          const [updated] = await db
            .update(payerVirtualAccounts)
            .set({ ...recoveredValues, updatedAt: new Date() })
            .where(eq(payerVirtualAccounts.id, existing.id))
            .returning();

          console.info("[SettleHQ VA] recovered existing Nomba virtual account", {
            id: updated.id,
            status: updated.status,
            accountRef: updated.accountRef,
            accountNumber: updated.accountNumber,
          });

          return updated;
        }

        const [created] = await db
          .insert(payerVirtualAccounts)
          .values(recoveredValues)
          .returning();

        console.info("[SettleHQ VA] stored recovered Nomba virtual account", {
          id: created.id,
          status: created.status,
          accountRef: created.accountRef,
          accountNumber: created.accountNumber,
        });

        return created;
      }
    }

    const writeValues = {
      ...baseValues,
      status: "failed",
      rawProviderResponse: {
        error: errorDetails,
      },
    } satisfies typeof payerVirtualAccounts.$inferInsert;

    if (existing) {
      const [updated] = await db
        .update(payerVirtualAccounts)
        .set({ ...writeValues, updatedAt: new Date() })
        .where(eq(payerVirtualAccounts.id, existing.id))
        .returning();

      console.info("[SettleHQ VA] stored failed virtual account update", {
        id: updated.id,
        status: updated.status,
        accountRef: updated.accountRef,
      });

      return updated;
    }

    const [created] = await db
      .insert(payerVirtualAccounts)
      .values(writeValues)
      .returning();

    console.info("[SettleHQ VA] stored failed virtual account row", {
      id: created.id,
      status: created.status,
      accountRef: created.accountRef,
    });

    return created;
  }
}