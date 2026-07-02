import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  organizationBankAccounts,
  organizationMemberships,
  organizationNombaAccounts,
  organizations,
} from "@/db/schema";
import { runtimeEnv } from "@/lib/env";
import {
  validateOrganizationInput,
  type OrganizationInput,
  type ValidOrganizationInput,
} from "@/lib/organizations";

export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export async function getActiveWorkspaceForUser(userId: number, db = getDb()) {
  const [membershipRow] = await db
    .select({
      membershipId: organizationMemberships.id,
      role: organizationMemberships.role,
      organization: organizations,
    })
    .from(organizationMemberships)
    .innerJoin(
      organizations,
      eq(organizationMemberships.organizationId, organizations.id),
    )
    .where(eq(organizationMemberships.userId, userId))
    .limit(1);

  if (!membershipRow) {
    return null;
  }

  const [nombaAccount] = await db
    .select()
    .from(organizationNombaAccounts)
    .where(
      and(
        eq(
          organizationNombaAccounts.organizationId,
          membershipRow.organization.id,
        ),
        eq(organizationNombaAccounts.isDefault, true),
      ),
    )
    .limit(1);

  const [bankAccount] = await db
    .select()
    .from(organizationBankAccounts)
    .where(
      and(
        eq(
          organizationBankAccounts.organizationId,
          membershipRow.organization.id,
        ),
        eq(organizationBankAccounts.isDefault, true),
      ),
    )
    .limit(1);

  return {
    membership: {
      id: membershipRow.membershipId,
      role: membershipRow.role,
    },
    organization: membershipRow.organization,
    nombaAccount: nombaAccount ?? null,
    bankAccount: bankAccount ?? null,
  };
}

export function assertHackathonSubAccountId(subAccountId: string | undefined) {
  if (!subAccountId) {
    throw new WorkspaceError(
      "NOMBA_HACKATHON_SUB_ACCOUNT_ID is not configured.",
    );
  }

  return subAccountId;
}

export async function createOrganizationWorkspace(
  userId: number,
  input: OrganizationInput | ValidOrganizationInput,
  db = getDb(),
  hackathonSubAccountId = runtimeEnv.nombaHackathonSubAccountId,
) {
  const validation = validateOrganizationInput(input);

  if (!validation.ok) {
    throw new WorkspaceError("Organization input is invalid.");
  }

  const providerAccountId = assertHackathonSubAccountId(hackathonSubAccountId);

  const [organization] = await db
    .insert(organizations)
    .values({
      name: validation.data.name,
      organizationType: validation.data.organizationType,
      email: validation.data.email,
      phone: validation.data.phone,
      logoUrl: validation.data.logoUrl,
      createdByUserId: userId,
    })
    .returning();

  const [membership] = await db
    .insert(organizationMemberships)
    .values({
      organizationId: organization.id,
      userId,
      role: "owner",
    })
    .returning();

  const [nombaAccount] = await db
    .insert(organizationNombaAccounts)
    .values({
      organizationId: organization.id,
      provider: "nomba",
      providerAccountId,
      accountType: "sub_account",
      accountName: `${organization.name} Nomba wallet`,
      currency: "NGN",
      status: "active",
      isDefault: true,
      isHackathonShared: true,
      rawProviderResponse: {
        mode: "hackathon",
        source: "NOMBA_HACKATHON_SUB_ACCOUNT_ID",
      },
    })
    .returning();

  return { organization, membership, nombaAccount };
}
