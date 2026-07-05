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
  const updateWhere = vi.fn(async () => []);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const select = vi.fn(() => {
    selectCall += 1;

    if (selectCall === 1) {
      return createPublicInvoiceSelectResult();
    }

    return createActiveCheckoutSelectResult(options.existingCheckoutRows ?? []);
  });

  return {
    db: { select, insert, update },
    insert,
    update,
    updateSet,
    updateWhere,
    values,
  };
}

describe("createOrReuseCheckoutForPublicInvoice", () => {
  it("reuses an existing active checkout url when the callback url still matches", async () => {
    const checkoutClient = vi.fn();
    const { db, insert, update } = createCheckoutDb({
      existingCheckoutRows: [
        {
          checkoutUrl: "https://checkout.nomba.test/existing",
          status: "active",
          callbackUrl:
            "https://settlehq.test/invoice/public-token?checkout_return=1",
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
    expect(update).not.toHaveBeenCalled();
  });

  it("expires an active checkout when its callback url is stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T10:00:00.000Z"));

    const checkoutClient = vi.fn(async () => ({
      checkoutLink: "https://checkout.nomba.test/fresh",
      orderReference: "SHQ-BFA-JDOE-INV-2026-000001-CHK-ABC123",
      rawResponse: { code: "00" },
    }));
    const { db, insert, updateSet, values } = createCheckoutDb({
      existingCheckoutRows: [
        {
          id: 88,
          checkoutUrl: "https://checkout.nomba.test/old",
          status: "active",
          callbackUrl:
            "http://localhost:3000/invoice/public-token?checkout_return=1",
        },
      ],
    });

    await expect(
      createOrReuseCheckoutForPublicInvoice("public-token", {
        appUrl: "https://settle-hq.vercel.app/",
        db: db as never,
        checkoutClient,
      }),
    ).resolves.toBe("https://checkout.nomba.test/fresh");

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "inactive",
        checkoutStatus: "expired",
      }),
    );
    expect(checkoutClient).toHaveBeenCalledWith(
      expect.objectContaining({
        orderReference: expect.stringMatching(
          /^SHQ-BFA-JDOE-INV-2026-000001-CHK-/,
        ),
        callbackUrl:
          "https://settle-hq.vercel.app/invoice/public-token?checkout_return=1",
      }),
    );
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutUrl: "https://checkout.nomba.test/fresh",
        optionType: "checkout",
        orderReference: "SHQ-BFA-JDOE-INV-2026-000001-CHK-ABC123",
        callbackUrl:
          "https://settle-hq.vercel.app/invoice/public-token?checkout_return=1",
      }),
    );

    vi.useRealTimers();
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
