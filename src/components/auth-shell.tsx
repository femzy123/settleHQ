import { Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  supportText: string;
};

export function AuthShell({
  children,
  eyebrow,
  title,
  supportText,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="flex min-h-[42vh] flex-col justify-between bg-primary px-6 py-6 text-primary-foreground sm:px-10 lg:min-h-screen">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex w-fit items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Building2 aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-semibold">SettleHQ</span>
                <span className="block text-sm text-primary-foreground/70">
                  Obligations dashboard
                </span>
              </span>
            </Link>
            <ThemeToggle />
          </header>

          <div className="max-w-2xl py-10 lg:py-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/72 sm:text-lg">
              {supportText}
            </p>
          </div>

          <div className="hidden max-w-xl rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4 text-sm text-primary-foreground/76 lg:block">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 text-accent" />
              <p>
                Clerk handles identity. SettleHQ stores only the operational
                profile needed to attach users to organizations and finance
                workflows.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[420px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
