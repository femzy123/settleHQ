import { describe, expect, it, vi } from "vitest";

import { createPayer, PayerError, updatePayer } from "./payers";

function createPayerDb(
  options: {
    duplicateRows?: unknown[];
    insertRows?: unknown[];
    updateRows?: unknown[];
  } = {},
) {
  const insertValues: unknown[] = [];
  const updateValues: unknown[] = [];
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => options.duplicateRows ?? []),
      })),
    })),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn((values: unknown) => {
      insertValues.push(values);
      return {
        returning: vi.fn(async () => options.insertRows ?? []),
      };
    }),
  }));
  const update = vi.fn(() => ({
    set: vi.fn((values: unknown) => {
      updateValues.push(values);
      return {
        where: vi.fn(() => ({
          returning: vi.fn(async () => options.updateRows ?? []),
        })),
      };
    }),
  }));

  return { db: { select, insert, update }, insertValues, updateValues };
}

describe("createPayer", () => {
  it("creates payers scoped to an organization", async () => {
    const payer = { id: 9, organizationId: 10, fullName: "John Doe" };
    const { db, insertValues } = createPayerDb({ insertRows: [payer] });

    await expect(
      createPayer(
        10,
        {
          fullName: "John Doe",
          email: "john@example.com",
          phone: "0800000000",
          externalId: "STU-001",
        },
        db as never,
      ),
    ).resolves.toBe(payer);

    expect(insertValues[0]).toMatchObject({
      organizationId: 10,
      fullName: "John Doe",
      email: "john@example.com",
      phone: "0800000000",
      externalId: "STU-001",
    });
  });

  it("rejects duplicate external IDs per organization", async () => {
    const { db } = createPayerDb({ duplicateRows: [{ id: 4 }] });

    await expect(
      createPayer(
        10,
        { fullName: "John Doe", externalId: "STU-001" },
        db as never,
      ),
    ).rejects.toThrow(PayerError);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("updatePayer", () => {
  it("updates only organization-owned payers", async () => {
    const payer = { id: 9, organizationId: 10, fullName: "Jane Doe" };
    const { db, updateValues } = createPayerDb({ updateRows: [payer] });

    await expect(
      updatePayer(
        10,
        9,
        { fullName: "Jane Doe", externalId: "STU-002" },
        db as never,
      ),
    ).resolves.toBe(payer);

    expect(updateValues[0]).toMatchObject({
      fullName: "Jane Doe",
      externalId: "STU-002",
    });
  });

  it("rejects updates when another payer already uses the external ID", async () => {
    const { db } = createPayerDb({ duplicateRows: [{ id: 7 }] });

    await expect(
      updatePayer(
        10,
        9,
        { fullName: "Jane Doe", externalId: "STU-002" },
        db as never,
      ),
    ).rejects.toThrow(PayerError);
    expect(db.update).not.toHaveBeenCalled();
  });
});
