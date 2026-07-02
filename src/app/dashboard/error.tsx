"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-accent-soft text-foreground">
          <AlertTriangle aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Dashboard could not load</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We could not finish syncing your SettleHQ user profile. Check the
          database configuration and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
