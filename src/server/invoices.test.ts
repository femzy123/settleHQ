import { describe, expect, it, vi } from "vitest";

import { generateInvoicesForCollection, InvoiceError } from "./invoices";

function createInvoiceDb(
  options: {
    collectionRows?: unknown[];
    assignmentRows?: unknown[];
    existingInvoiceRows?: Array<{ payerId: number }>;
    finalRows?: unknown[];
  } = {},
) {
  let selectCall = 0;
  const insertValues: unknown[] = [];
  const updateValues: unknown[] = [];
  const select = vi.fn(() => {
    selectCall += 1;

    if (selectCall === 1) {
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => options.collectionRows ?? []),
          })),
        })),
      };
    }

    if (selectCall === 2) {
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => options.assignmentRows ?? []),
          })),
        })),
      };
    }

    if (selectCall === 3) {
      return {
        from: vi.fn(() => ({
          where: vi.fn(async () => options.existingInvoiceRows ?? []),
        })),
      };
    }

    return {
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => options.finalRows ?? []),
            })),
          })),
        })),
      })),
    };
  });
  const insert = vi.fn(() => ({
    values: vi.fn((values: unknown) => {
      insertValues.push(values);
      return Promise.resolve([]);
    }),
  }));
  const update = vi.fn(() => ({
    set: vi.fn((values: unknown) => {
      updateValues.push(values);
      return { where: vi.fn(async () => []) };
    }),
  }));

  return { db: { select, insert, update }, insertValues, updateValues };
}

const collection = {
  id: 22,
  organizationId: 10,
  amountKobo: 15_000_000,
  currency: "NGN",
  dueDate: "2026-08-01",
  status: "draft",
};

describe("generateInvoicesForCollection", () => {
  it("creates missing invoices and activates the collection", async () => {
    const finalRows = [
      {
        invoice: {
          id: 1,
          payerId: 3,
          invoiceNumber: "SHQ-BFA-INV-2026-000101",
        },
        payer: {
          id: 3,
          fullName: "John Doe",
          email: null,
          phone: null,
          externalId: null,
        },
        collection: { id: 22, name: "Term fees", status: "active" },
      },
    ];
    const { db, insertValues, updateValues } = createInvoiceDb({
      collectionRows: [collection],
      assignmentRows: [
        { assignmentId: 101, payerId: 3 },
        { assignmentId: 102, payerId: 4 },
      ],
      existingInvoiceRows: [{ payerId: 4 }],
      finalRows,
    });

    await expect(
      generateInvoicesForCollection(
        10,
        "Bright Future Academy",
        22,
        db as never,
      ),
    ).resolves.toEqual([
      {
        id: 1,
        payerId: 3,
        invoiceNumber: "SHQ-BFA-INV-2026-000101",
        payer: {
          id: 3,
          fullName: "John Doe",
          email: null,
          phone: null,
          externalId: null,
        },
        collection: { id: 22, name: "Term fees", status: "active" },
      },
    ]);

    expect(insertValues[0]).toEqual([
      {
        organizationId: 10,
        collectionId: 22,
        payerId: 3,
        invoiceNumber: "SHQ-BFA-INV-2026-000101",
        amountDueKobo: 15_000_000,
        amountPaidKobo: 0,
        currency: "NGN",
        dueDate: "2026-08-01",
        status: "pending",
      },
    ]);
    expect(updateValues[0]).toMatchObject({ status: "active" });
  });

  it("does not insert duplicate invoices when generation is repeated", async () => {
    const { db, insertValues } = createInvoiceDb({
      collectionRows: [{ ...collection, status: "active" }],
      assignmentRows: [{ assignmentId: 101, payerId: 3 }],
      existingInvoiceRows: [{ payerId: 3 }],
      finalRows: [],
    });

    await generateInvoicesForCollection(
      10,
      "Bright Future Academy",
      22,
      db as never,
    );

    expect(insertValues).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects collections with no assigned payers", async () => {
    const { db } = createInvoiceDb({ collectionRows: [collection] });

    await expect(
      generateInvoicesForCollection(
        10,
        "Bright Future Academy",
        22,
        db as never,
      ),
    ).rejects.toThrow(InvoiceError);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
