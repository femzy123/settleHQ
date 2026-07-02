import { ArrowUpRight, Banknote, Clock3 } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";

const metrics = [
  {
    label: "Outstanding Collections",
    value: "NGN 4.2m",
    helper: "Across 128 open invoices",
  },
  { label: "Collection Rate", value: "82%", helper: "18% left to collect" },
  { label: "Invoices Due Today", value: "14", helper: "6 require follow-up" },
  { label: "Recent Payments", value: "NGN 230k", helper: "Received today" },
];

const activity = [
  {
    title: "Invoice INV-1042 paid",
    detail: "Amina Yusuf completed school fees",
    time: "8 min ago",
  },
  {
    title: "Transfer matched",
    detail: "Payment matched to an invoice",
    time: "18 min ago",
  },
  {
    title: "Collection published",
    detail: "Term 2 fees sent to 86 payers",
    time: "42 min ago",
  },
];

const reconciliation = [
  { label: "Matched Automatically", value: 94, status: "good" },
  { label: "Underpayments", value: 3, status: "warn" },
  { label: "Overpayments", value: 1, status: "warn" },
  { label: "Unknown Payments", value: 2, status: "danger" },
];

type DashboardShellProps = {
  organizationName: string;
  organizationTypeLabel: string;
  userEmail: string;
  userName?: string | null;
};

export function DashboardShell({
  organizationName,
  organizationTypeLabel,
  userEmail,
  userName,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen lg:pl-[264px]">
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
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
                New Collection
                <ArrowUpRight aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-5">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-soft)]"
                  >
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold">
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
                        The finance team starts with who still owes.
                      </p>
                    </div>
                    <Banknote aria-hidden="true" className="text-accent" />
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    {[
                      [
                        "Term 2 School Fees",
                        "NGN 2.8m",
                        "64 invoices open",
                        "72%",
                      ],
                      ["PTA Levy", "NGN 760k", "31 invoices open", "58%"],
                      ["Bus Service", "NGN 640k", "33 invoices open", "86%"],
                    ].map(([name, amount, open, rate]) => (
                      <div key={name} className="rounded-lg bg-muted p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {open}
                            </p>
                          </div>
                          <p className="font-semibold">{amount}</p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-background">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: rate }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Reconciliation Center
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Confirmed payments land here before receipts are issued.
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
                  {activity.map((item) => (
                    <div
                      key={item.title}
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
                  ))}
                </div>
              </article>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
