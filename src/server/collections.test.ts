import { describe, expect, it, vi } from "vitest";

import { CollectionError, createDraftCollection } from "./collections";

function createCollectionDb(options: { payerRows?: unknown[] } = {}) {
  const insertValues: unknown[] = [];
  let insertCall = 0;
  const collection = { id: 22, organizationId: 10, name: "Term fees" };
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => options.payerRows ?? []),
    })),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn((values: unknown) => {
      insertValues.push(values);
      insertCall += 1;

      if (insertCall === 1) {
        return {
          returning: vi.fn(async () => [collection]),
        };
      }

      return Promise.resolve([]);
    }),
  }));

  return { db: { select, insert }, insertValues, collection };
}

describe("createDraftCollection", () => {
  it("creates draft collections with assigned payers", async () => {
    const { db, insertValues, collection } = createCollectionDb({
      payerRows: [{ id: 3 }, { id: 4 }],
    });

    await expect(
      createDraftCollection(
        10,
        7,
        {
          name: "Term fees",
          description: "Second term",
          amount: "150000",
          dueDate: "2026-08-01",
          payerIds: [3, 4],
        },
        db as never,
      ),
    ).resolves.toBe(collection);

    expect(insertValues[0]).toMatchObject({
      organizationId: 10,
      name: "Term fees",
      description: "Second term",
      amountKobo: 15_000_000,
      dueDate: "2026-08-01",
      status: "draft",
      createdByUserId: 7,
    });
    expect(insertValues[1]).toEqual([
      { organizationId: 10, collectionId: 22, payerId: 3 },
      { organizationId: 10, collectionId: 22, payerId: 4 },
    ]);
  });

  it("prevents duplicate payer assignment", async () => {
    const { db, insertValues } = createCollectionDb({ payerRows: [{ id: 3 }] });

    await createDraftCollection(
      10,
      7,
      {
        name: "Term fees",
        amount: "150000",
        dueDate: "2026-08-01",
        payerIds: [3, 3],
      },
      db as never,
    );

    expect(insertValues[1]).toEqual([
      { organizationId: 10, collectionId: 22, payerId: 3 },
    ]);
  });

  it("rejects payer IDs outside the organization", async () => {
    const { db } = createCollectionDb({ payerRows: [{ id: 3 }] });

    await expect(
      createDraftCollection(
        10,
        7,
        {
          name: "Term fees",
          amount: "150000",
          dueDate: "2026-08-01",
          payerIds: [3, 4],
        },
        db as never,
      ),
    ).rejects.toThrow(CollectionError);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
