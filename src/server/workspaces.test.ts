import { describe, expect, it, vi } from "vitest";

import {
  assertHackathonSubAccountId,
  createOrganizationWorkspace,
  getActiveWorkspaceForUser,
  WorkspaceError,
} from "./workspaces";

function createInsertDb(returningRows: unknown[]) {
  let callIndex = 0;
  const valueCalls: unknown[] = [];
  const insert = vi.fn(() => ({
    values: vi.fn((values: unknown) => {
      valueCalls.push(values);
      const returning = vi.fn(async () => [returningRows[callIndex++]]);

      return { returning };
    }),
  }));

  return { db: { insert }, valueCalls };
}

function createSelectDb(resultSets: unknown[][]) {
  let callIndex = 0;
  const select = vi.fn(() => {
    const rows = resultSets[callIndex++] ?? [];
    const limit = vi.fn(async () => rows);
    const where = vi.fn(() => ({ limit }));
    const innerJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ innerJoin, where }));

    return { from };
  });

  return { select };
}

describe("assertHackathonSubAccountId", () => {
  it("requires the configured Nomba account id", () => {
    expect(() => assertHackathonSubAccountId(undefined)).toThrow(
      WorkspaceError,
    );
    expect(assertHackathonSubAccountId("sub-account-123")).toBe(
      "sub-account-123",
    );
  });
});

describe("createOrganizationWorkspace", () => {
  it("creates organization, owner membership, and Nomba wallet mapping", async () => {
    const organization = { id: 10, name: "Bright Future Academy" };
    const membership = { id: 11, organizationId: 10, userId: 7, role: "owner" };
    const nombaAccount = { id: 12, organizationId: 10 };
    const { db, valueCalls } = createInsertDb([
      organization,
      membership,
      nombaAccount,
    ]);

    const result = await createOrganizationWorkspace(
      7,
      {
        name: "Bright Future Academy",
        organizationType: "school",
        email: "finance@school.test",
        phone: "0800000000",
        logoUrl: null,
      },
      db as never,
      "sub-account-123",
    );

    expect(result).toEqual({ organization, membership, nombaAccount });
    expect(valueCalls[0]).toMatchObject({
      name: "Bright Future Academy",
      organizationType: "school",
      createdByUserId: 7,
    });
    expect(valueCalls[1]).toEqual({
      organizationId: 10,
      userId: 7,
      role: "owner",
    });
    expect(valueCalls[2]).toMatchObject({
      organizationId: 10,
      providerAccountId: "sub-account-123",
      isDefault: true,
      isHackathonShared: true,
    });
  });

  it("fails before writing when the configured Nomba account is missing", async () => {
    const { db } = createInsertDb([]);

    await expect(
      createOrganizationWorkspace(
        7,
        { name: "Bright Future Academy", organizationType: "school" },
        db as never,
        undefined,
      ),
    ).rejects.toThrow(WorkspaceError);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("getActiveWorkspaceForUser", () => {
  it("returns null when the user has no membership", async () => {
    const db = createSelectDb([[]]);

    await expect(getActiveWorkspaceForUser(7, db as never)).resolves.toBeNull();
  });

  it("returns organization, membership, Nomba account, and bank account context", async () => {
    const organization = {
      id: 10,
      name: "Bright Future Academy",
      organizationType: "school",
    };
    const nombaAccount = { id: 12, organizationId: 10 };
    const bankAccount = { id: 13, organizationId: 10 };
    const db = createSelectDb([
      [{ membershipId: 11, role: "owner", organization }],
      [nombaAccount],
      [bankAccount],
    ]);

    await expect(getActiveWorkspaceForUser(7, db as never)).resolves.toEqual({
      membership: { id: 11, role: "owner" },
      organization,
      nombaAccount,
      bankAccount,
    });
  });
});
