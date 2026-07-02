import { describe, expect, it, vi } from "vitest";

import {
  ClerkUserSyncError,
  mapClerkUserForSync,
  upsertUserValues,
  type UserUpsertValues,
} from "./users";

describe("mapClerkUserForSync", () => {
  it("maps Clerk identity into the local users table shape", () => {
    expect(
      mapClerkUserForSync({
        id: "user_123",
        primaryEmailAddress: { emailAddress: "Owner@School.test" },
        fullName: "Ada Owner",
        imageUrl: "https://img.test/avatar.png",
      }),
    ).toEqual({
      clerkUserId: "user_123",
      email: "owner@school.test",
      fullName: "Ada Owner",
      avatarUrl: "https://img.test/avatar.png",
    });
  });

  it("falls back to the primary email id and composed name", () => {
    expect(
      mapClerkUserForSync({
        id: "user_456",
        primaryEmailAddressId: "email_2",
        emailAddresses: [
          { id: "email_1", emailAddress: "first@example.test" },
          { id: "email_2", emailAddress: "Second@example.test" },
        ],
        firstName: "Finance",
        lastName: "Lead",
      }),
    ).toMatchObject({
      email: "second@example.test",
      fullName: "Finance Lead",
      avatarUrl: null,
    });
  });

  it("rejects users without an email address", () => {
    expect(() => mapClerkUserForSync({ id: "user_no_email" })).toThrow(
      ClerkUserSyncError,
    );
  });
});

describe("upsertUserValues", () => {
  it("upserts by Clerk user id and returns the saved user", async () => {
    const values: UserUpsertValues = {
      clerkUserId: "user_123",
      email: "owner@school.test",
      fullName: "Ada Owner",
      avatarUrl: null,
    };
    const savedUser = { id: 1, ...values };
    const returning = vi.fn().mockResolvedValue([savedUser]);
    const onConflictDoUpdate = vi.fn(() => ({ returning }));
    const valuesFn = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn(() => ({ values: valuesFn }));

    const result = await upsertUserValues({ insert } as never, values);

    expect(result).toEqual(savedUser);
    expect(insert).toHaveBeenCalledOnce();
    expect(valuesFn).toHaveBeenCalledWith(values);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          email: values.email,
          fullName: values.fullName,
          avatarUrl: values.avatarUrl,
          updatedAt: expect.any(Date),
        }),
      }),
    );
    expect(returning).toHaveBeenCalledOnce();
  });
});
