import { describe, expect, it, vi } from "vitest";

import { InvoiceError, sendInvoicesForSelectedPayers } from "./invoices";

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
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => options.assignmentRows ?? []),
            })),
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

const assignment = {
  assignmentId: 101,
  payerId: 3,
  payer: {
    id: 3,
    fullName: "John Doe",
    email: "john@example.com",
    phone: null,
    externalId: "Flat-1",
  },
};

const finalRows = [
  {
    invoice: {
      id: 1,
      organizationId: 10,
      collectionId: 22,
      payerId: 3,
      invoiceNumber: "SHQ-BFA-FLAT1-INV-2026-000101",
      publicToken: "public-token",
      amountDueKobo: 15_000_000,
      amountPaidKobo: 0,
      currency: "NGN",
      dueDate: "2026-08-01",
      status: "pending",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
    payer: assignment.payer,
    collection: { id: 22, name: "Term fees", status: "active" },
  },
];

describe("sendInvoicesForSelectedPayers", () => {
  it("creates invoices only for selected payers and activates the collection", async () => {
    const { db, insertValues, updateValues } = createInvoiceDb({
      collectionRows: [collection],
      assignmentRows: [assignment],
      existingInvoiceRows: [],
      finalRows,
    });

    await expect(
      sendInvoicesForSelectedPayers(
        10,
        "Bright Future Academy",
        22,
        [3],
        db as never,
      ),
    ).resolves.toMatchObject([
      {
        id: 1,
        payerId: 3,
        invoiceNumber: "SHQ-BFA-FLAT1-INV-2026-000101",
        publicPath: "/invoice/public-token",
        wasCreated: true,
      },
    ]);

    expect(insertValues[0]).toEqual([
      {
        organizationId: 10,
        collectionId: 22,
        payerId: 3,
        invoiceNumber: "SHQ-BFA-FLAT1-INV-2026-000101",
        amountDueKobo: 15_000_000,
        amountPaidKobo: 0,
        currency: "NGN",
        dueDate: "2026-08-01",
        status: "pending",
      },
    ]);
    expect(updateValues[0]).toMatchObject({ status: "active" });
  });

  it("does not insert duplicate invoices when a selected payer already has one", async () => {
    const { db, insertValues, updateValues } = createInvoiceDb({
      collectionRows: [{ ...collection, status: "active" }],
      assignmentRows: [assignment],
      existingInvoiceRows: [{ payerId: 3 }],
      finalRows,
    });

    const result = await sendInvoicesForSelectedPayers(
      10,
      "Bright Future Academy",
      22,
      [3],
      db as never,
    );

    expect(result[0]).toMatchObject({ wasCreated: false });
    expect(insertValues).toEqual([]);
    expect(updateValues).toEqual([]);
  });

  it("rejects empty payer selection", async () => {
    const { db } = createInvoiceDb();

    await expect(
      sendInvoicesForSelectedPayers(
        10,
        "Bright Future Academy",
        22,
        [],
        db as never,
      ),
    ).rejects.toThrow(InvoiceError);
    expect(db.select).not.toHaveBeenCalled();
  });
});
