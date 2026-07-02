import { currentUser } from "@clerk/nextjs/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

export type ClerkUserForSync = {
  id: string;
  primaryEmailAddress?: ClerkEmailAddress | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailAddress[];
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  imageUrl?: string | null;
};

export type UserUpsertValues = {
  clerkUserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export class ClerkUserSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClerkUserSyncError";
  }
}

export function mapClerkUserForSync(
  clerkUser: ClerkUserForSync,
): UserUpsertValues {
  const primaryEmail =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!primaryEmail) {
    throw new ClerkUserSyncError(
      "Authenticated Clerk user does not have an email address.",
    );
  }

  const fallbackName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");
  const fullName = (clerkUser.fullName ?? fallbackName) || null;

  return {
    clerkUserId: clerkUser.id,
    email: primaryEmail.toLowerCase(),
    fullName,
    avatarUrl: clerkUser.imageUrl ?? null,
  };
}

export async function upsertUserValues(
  db: ReturnType<typeof getDb>,
  values: UserUpsertValues,
) {
  const [user] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: values.email,
        fullName: values.fullName,
        avatarUrl: values.avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function syncClerkUser(clerkUser: ClerkUserForSync, db = getDb()) {
  return upsertUserValues(db, mapClerkUserForSync(clerkUser));
}

export async function syncCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new ClerkUserSyncError("No authenticated Clerk user found.");
  }

  return syncClerkUser(clerkUser);
}
