import { describe, expect, it, vi } from "vitest";

import { createOrReuseCheckoutForPublicInvoice } from "./invoices";

function createPublicInvoiceSelectResult() {
  const limit = vi.fn(async () => [
    {
      invoice: {
        id: 12,
        organizationId: 7,
        collectionId: 30,
        payerId: 42,
        invoiceNumber: "SHQ-BFA-JDOE-INV-2026-000001",
        publicToken: "public-token",
        amountDueKobo: 250_000,
        amountPaidKobo: 0,
        currency: "NGN",
        dueDate: "2026-09-01",
        status: "pending",
      },
      organization: {
        id: 7,
        name: "Bright Future Academy",
        email: null,
        phone: null,
        logoUrl: null,
      },
      payer: {
        id: 42,
        fullName: "John Doe",
        email: "payer@example.com",
        phone: null,
        externalId: null,
      },
      collection: {
        id: 30,
        name: "Term fees",
        status: "active",
      },
    },
  ]);
  const where = vi.fn(() => ({ limit }));
  const thirdJoin = vi.fn(() => ({ where }));
  const secondJoin = vi.fn(() => ({ innerJoin: thirdJoin }));
  const firstJoin = vi.fn(() => ({ innerJoin: secondJoin }));

  return {
    from: vi.fn(() => ({ innerJoin: firstJoin })),
  };
}

function createActiveCheckoutSelectResult(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(async () => rows),
        })),
      })),
    })),
  };
}

function createCheckoutDb(options: { existingCheckoutRows?: unknown[] } = {}) {
  let selectCall = 0;
  const values = vi.fn(async () => []);
  const insert = vi.fn(() => ({ values }));
  const select = vi.fn(() => {
    selectCall += 1;

    if (selectCall === 1) {
      return createPublicInvoiceSelectResult();
    }

    return createActiveCheckoutSelectResult(options.existingCheckoutRows ?? []);
  });

  return { db: { select, insert }, insert, values };
}

describe("createOrReuseCheckoutForPublicInvoice", () => {
  it("reuses an existing active checkout url", async () => {
    const checkoutClient = vi.fn();
    const { db, insert } = createCheckoutDb({
      existingCheckoutRows: [
        {
          checkoutUrl: "https://checkout.nomba.test/existing",
          status: "active",
        },
      ],
    });

    await expect(
      createOrReuseCheckoutForPublicInvoice("public-token", {
        appUrl: "https://settlehq.test",
        db: db as never,
        checkoutClient,
      }),
    ).resolves.toBe("https://checkout.nomba.test/existing");

    expect(checkoutClient).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates a checkout order when none exists", async () => {
    const checkoutClient = vi.fn(async () => ({
      checkoutLink: "https://checkout.nomba.test/new",
      orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
      rawResponse: { code: "00" },
    }));
    const { db, insert, values } = createCheckoutDb();

    await expect(
      createOrReuseCheckoutForPublicInvoice("public-token", {
        appUrl: "https://settlehq.test/",
        db: db as never,
        checkoutClient,
      }),
    ).resolves.toBe("https://checkout.nomba.test/new");

    expect(checkoutClient).toHaveBeenCalledWith(
      expect.objectContaining({
        orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
        customerId: "42",
        customerEmail: "payer@example.com",
        amountKobo: 250_000,
        callbackUrl:
          "https://settlehq.test/invoice/public-token?checkout_return=1",
        metadata: expect.objectContaining({
          invoiceId: "12",
          payerId: "42",
          organizationId: "7",
        }),
      }),
    );
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutUrl: "https://checkout.nomba.test/new",
        optionType: "checkout",
        orderReference: "SHQ-BFA-JDOE-INV-2026-000001",
      }),
    );
  });
});
