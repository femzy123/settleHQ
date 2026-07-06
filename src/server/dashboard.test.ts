import { describe, expect, it } from "vitest";

import {
  buildDashboardMetrics,
  calculateCollectionRate,
  getLagosDateKey,
} from "./dashboard";

describe("calculateCollectionRate", () => {
  it("returns zero when no invoices have been issued", () => {
    expect(calculateCollectionRate(0, 0)).toBe(0);
  });

  it("rounds paid amount over total due into a percentage", () => {
    expect(calculateCollectionRate(100_000, 82_000)).toBe(82);
  });

  it("caps overpayments at 100 percent", () => {
    expect(calculateCollectionRate(100_000, 120_000)).toBe(100);
  });
});

describe("buildDashboardMetrics", () => {
  it("builds operational dashboard cards from invoice and payment totals", () => {
    const metrics = buildDashboardMetrics({
      totalDueKobo: 500_000,
      totalPaidKobo: 410_000,
      outstandingKobo: 90_000,
      openInvoiceCount: 3,
      dueTodayCount: 2,
      todayPaymentKobo: 150_000,
      pendingReconciliationCount: 1,
    });

    expect(metrics).toHaveLength(5);
    expect(metrics[0]).toMatchObject({
      label: "Outstanding Collections",
      helper: "3 open invoices",
    });
    expect(metrics[1]).toMatchObject({
      label: "Collection Rate",
      value: "82%",
      helper: "18% left to collect",
    });
    expect(metrics[2]).toMatchObject({
      label: "Invoices Due Today",
      value: "2",
      helper: "Needs same-day follow-up",
    });
    expect(metrics[3]).toMatchObject({
      label: "Recent Payments",
      helper: "Received today",
    });
    expect(metrics[4]).toMatchObject({
      label: "Pending Reconciliation",
      value: "1",
      helper: "Needs finance review",
    });
  });

  it("uses safe helpers for empty organizations", () => {
    const metrics = buildDashboardMetrics({
      totalDueKobo: 0,
      totalPaidKobo: 0,
      outstandingKobo: 0,
      openInvoiceCount: 0,
      dueTodayCount: 0,
      todayPaymentKobo: 0,
      pendingReconciliationCount: 0,
    });

    expect(metrics[1]).toMatchObject({
      value: "0%",
      helper: "No invoices sent yet",
    });
    expect(metrics[2]).toMatchObject({
      value: "0",
      helper: "No invoice due today",
    });
  });
});

describe("getLagosDateKey", () => {
  it("formats date keys in Africa/Lagos time", () => {
    expect(getLagosDateKey(new Date("2026-07-05T23:30:00.000Z"))).toBe(
      "2026-07-06",
    );
  });
});
