import {
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Collections", icon: ListChecks },
  { label: "Payers", icon: UsersRound },
  { label: "Invoices", icon: FileText },
  { label: "Payments", icon: WalletCards },
  { label: "Reports", icon: ReceiptText },
  { label: "Settings", icon: Settings },
];

const metrics = [
  { label: "Outstanding Collections", value: "NGN 4.2m", helper: "Across 128 open invoices" },
  { label: "Collection Rate", value: "82%", helper: "18% left to collect" },
  { label: "Invoices Due Today", value: "14", helper: "6 require follow-up" },
  { label: "Recent Payments", value: "NGN 230k", helper: "Received today" },
];

const activity = [
  { title: "Invoice INV-1042 paid", detail: "Amina Yusuf completed school fees", time: "8 min ago" },
  { title: "Transfer matched", detail: "Temporary account payment reconciled", time: "18 min ago" },
  { title: "Collection published", detail: "Term 2 fees sent to 86 payers", time: "42 min ago" },
];

const reconciliation = [
  { label: "Matched Automatically", value: 94, status: "good" },
  { label: "Underpayments", value: 3, status: "warn" },
  { label: "Overpayments", value: 1, status: "warn" },
  { label: "Unknown Payments", value: 2, status: "danger" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[264px_1fr]">
        <aside className="border-b border-border bg-primary text-primary-foreground lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-8 px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                <Building2 aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold">SettleHQ</p>
                <p className="text-sm text-primary-foreground/70">Obligations dashboard</p>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href="#"
                    className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      item.active
                        ? "bg-primary-foreground text-primary"
                        : "text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-auto hidden rounded-lg border border-white/15 bg-white/10 p-4 text-sm text-primary-foreground/75 lg:block">
              <p className="font-medium text-primary-foreground">Webhook target</p>
              <p className="mt-2 font-mono text-xs">/api/webhooks/nomba</p>
            </div>
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Demo workspace</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Greenfield School Finance</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href="/api/health" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium">
                <CheckCircle2 aria-hidden="true" />
                Health
              </a>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                New Collection
                <ArrowUpRight aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-5">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <article key={metric.label} className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-sm font-medium text-muted">{metric.label}</p>
                    <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
                    <p className="mt-2 text-sm text-muted">{metric.helper}</p>
                  </article>
                ))}
              </section>

              <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Outstanding Collections</h2>
                      <p className="mt-1 text-sm text-muted">The finance team starts with who still owes.</p>
                    </div>
                    <Banknote aria-hidden="true" className="text-accent" />
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    {[
                      ["Term 2 School Fees", "NGN 2.8m", "64 invoices open", "72%"],
                      ["PTA Levy", "NGN 760k", "31 invoices open", "58%"],
                      ["Bus Service", "NGN 640k", "33 invoices open", "86%"],
                    ].map(([name, amount, open, rate]) => (
                      <div key={name} className="rounded-lg bg-surface-strong p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="mt-1 text-sm text-muted">{open}</p>
                          </div>
                          <p className="font-semibold">{amount}</p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white">
                          <div className="h-2 rounded-full bg-primary" style={{ width: rate }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Reconciliation Center</h2>
                      <p className="mt-1 text-sm text-muted">Payments from Nomba webhooks land here first.</p>
                    </div>
                    <Clock3 aria-hidden="true" className="text-accent" />
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    {reconciliation.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span
                          className={`rounded-md px-2 py-1 text-sm font-semibold ${
                            item.status === "good"
                              ? "bg-primary text-primary-foreground"
                              : item.status === "danger"
                                ? "bg-danger text-white"
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
              <article className="rounded-lg border border-border bg-surface p-5">
                <h2 className="text-lg font-semibold">Nomba Flow</h2>
                <div className="mt-5 flex flex-col gap-3 text-sm">
                  {[
                    "Organization uses shared hackathon sub-account ID",
                    "Collection creates invoices for payers",
                    "Each invoice gets temporary payment instructions",
                    "Webhook confirms payment into the wallet",
                    "Receipt and reconciliation status are generated",
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3 rounded-lg bg-surface-strong p-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-lg border border-border bg-surface p-5">
                <h2 className="text-lg font-semibold">Latest Activity</h2>
                <div className="mt-5 flex flex-col gap-4">
                  {activity.map((item) => (
                    <div key={item.title} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted">{item.detail}</p>
                      <p className="mt-2 text-xs font-medium text-muted">{item.time}</p>
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
