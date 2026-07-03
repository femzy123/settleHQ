import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ListChecks,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

const proofPoints = [
  "Collections before payments",
  "Public invoice pages with Checkout",
  "Nomba webhooks for wallet confirmation",
  "Receipts and reconciliation from one dashboard",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="grid min-h-screen lg:grid-cols-[1fr_460px]">
        <div className="flex flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold">SettleHQ</p>
                <p className="text-sm text-muted-foreground">
                  Financial obligations OS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/sign-in"
                className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-strong"
              >
                Sign in
              </Link>
            </div>
          </header>

          <div className="max-w-3xl py-16 sm:py-20 lg:py-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Hackathon MVP
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Track who owes, what is due, and what has settled.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              SettleHQ gives schools, estates, clubs, and service businesses one
              operational dashboard for collections, invoices, payments,
              receipts, and reconciliation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Create account
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard"
                prefetch={false}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-medium hover:bg-surface-strong"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-4">
            {proofPoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 aria-hidden="true" className="text-primary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="border-t border-border bg-primary p-5 text-primary-foreground sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex h-full min-h-105 flex-col justify-between rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-5">
            <div>
              <p className="text-sm font-medium text-primary-foreground/70">
                Dashboard preview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Sample School Finance
              </h2>
            </div>

            <div className="grid gap-3">
              {[
                ["Outstanding Collections", "NGN 4.2m"],
                ["Collection Rate", "82%"],
                ["Invoices Due Today", "14"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-primary-foreground p-4 text-primary"
                >
                  <p className="text-sm font-medium text-primary/65">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-primary-foreground/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Reconciliation Center</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    Webhook-backed matching queue
                  </p>
                </div>
                <ReceiptText aria-hidden="true" className="text-accent" />
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-primary-foreground/10 p-3 text-sm">
                <ListChecks aria-hidden="true" />
                <span>94 automatically matched payments</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
