import { ArrowUpRight, Banknote, Clock3 } from "lucide-react";
import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { buttonVariants } from "@/components/ui/button";
import { formatKoboAsNaira } from "@/lib/money";
import { cn } from "@/lib/utils";

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardOutstandingCollection = {
  id: number;
  name: string;
  outstandingKobo: number;
  openInvoiceCount: number;
  collectionRate: number;
};

export type DashboardActivity = {
  title: string;
  detail: string;
  time: string;
};

export type DashboardReconciliationItem = {
  label: string;
  value: number;
  status: "good" | "warn" | "danger";
};

type DashboardShellProps = {
  organizationName: string;
  organizationTypeLabel: string;
  userEmail: string;
  userName?: string | null;
  metrics: DashboardMetric[];
  outstandingCollections: DashboardOutstandingCollection[];
  activity: DashboardActivity[];
  reconciliation: DashboardReconciliationItem[];
};

export function DashboardShell({
  organizationName,
  organizationTypeLabel,
  userEmail,
  userName,
  metrics,
  outstandingCollections,
  activity,
  reconciliation,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen lg:pl-66">
        <AppSidebar
          activeItem="Dashboard"
          userEmail={userEmail}
          userName={userName}
        />

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {organizationTypeLabel} workspace
              </p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
                {organizationName}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/collections/new"
                className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}
              >
                New Collection
                <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
              </Link>
            </div>
          </header>

          <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-5">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-soft)]"
                  >
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {metric.helper}
                    </p>
                  </article>
                ))}
              </section>

              <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Outstanding Collections
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Open obligations ranked by unpaid balance.
                      </p>
                    </div>
                    <Banknote aria-hidden="true" className="text-accent" />
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    {outstandingCollections.length > 0 ? (
                      outstandingCollections.map((collection) => (
                        <Link
                          key={collection.id}
                          href={`/collections/${collection.id}`}
                          className="rounded-lg bg-muted p-4 transition hover:bg-muted/75"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">{collection.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {collection.openInvoiceCount} open invoice
                                {collection.openInvoiceCount === 1 ? "" : "s"}
                              </p>
                            </div>
                            <p className="font-semibold tabular-nums">
                              {formatKoboAsNaira(collection.outstandingKobo)}
                            </p>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-background">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${collection.collectionRate}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-medium text-muted-foreground">
                            {collection.collectionRate}% collected
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/35 p-5 text-sm text-muted-foreground">
                        No outstanding collection yet. Create a collection and
                        send invoices to start tracking balances.
                      </div>
                    )}
                  </div>
                </article>

                <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Reconciliation Center
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Payment matching status across verified receipts.
                      </p>
                    </div>
                    <Clock3 aria-hidden="true" className="text-accent" />
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    {reconciliation.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                      >
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                        <span
                          className={`rounded-md px-2 py-1 text-sm font-semibold ${
                            item.status === "good"
                              ? "bg-success text-success-foreground"
                              : item.status === "danger"
                                ? "bg-danger text-danger-foreground"
                                : "bg-accent-soft text-foreground"
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>

            <aside className="flex flex-col gap-5">
              <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold">Latest Activity</h2>
                <div className="mt-5 flex flex-col gap-4">
                  {activity.length > 0 ? (
                    activity.map((item) => (
                      <div
                        key={`${item.title}-${item.time}`}
                        className="border-b border-border pb-4 last:border-0 last:pb-0"
                      >
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.detail}
                        </p>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                          {item.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/35 p-5 text-sm text-muted-foreground">
                      Payment activity will appear here once invoices are paid.
                    </div>
                  )}
                </div>
              </article>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
