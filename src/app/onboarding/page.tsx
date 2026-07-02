import { ArrowRight, Building2, ShieldCheck, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export default async function OnboardingPage() {
  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (workspace) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <div className="flex flex-col justify-between bg-primary px-6 py-6 text-primary-foreground sm:px-10 lg:min-h-screen">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Building2 aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-semibold">SettleHQ</p>
                <p className="text-sm text-primary-foreground/70">
                  Workspace setup
                </p>
              </div>
            </div>
            <ThemeToggle />
          </header>

          <div className="max-w-2xl py-12 lg:py-0">
            <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Create the workspace your finance team will operate from.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/72 sm:text-lg">
              SettleHQ keeps the same dashboard for every organization. We only
              need the business context required to scope collections, invoices,
              payments, and Nomba wallet activity.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-primary-foreground/78 sm:grid-cols-2">
            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4">
              <ShieldCheck aria-hidden="true" className="text-accent" />
              <p className="mt-3 font-medium text-primary-foreground">
                Owner membership
              </p>
              <p className="mt-1">Your user becomes the workspace owner.</p>
            </div>
            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4">
              <WalletCards aria-hidden="true" className="text-accent" />
              <p className="mt-3 font-medium text-primary-foreground">
                Nomba wallet mapping
              </p>
              <p className="mt-1">
                Collection routing is configured behind the scenes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6">
          <section className="w-full max-w-[460px] rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Step 1 of 1
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Organization details
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Bank withdrawal details are deferred to Settings so you can
                  enter the workspace quickly.
                </p>
              </div>
              <ArrowRight aria-hidden="true" className="mt-1 text-accent" />
            </div>
            <OnboardingForm />
          </section>
        </div>
      </section>
    </main>
  );
}
