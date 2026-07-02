import { Landmark, Settings, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { getOrganizationTypeLabel } from "@/lib/organizations";
import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export default async function SettingsPage() {
  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  const walletActive = workspace.nombaAccount?.status === "active";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen lg:pl-[264px]">
        <AppSidebar
          activeItem="Settings"
          userEmail={user.email}
          userName={user.fullName}
        />

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="border-b border-border pb-5">
            <p className="text-sm font-medium text-muted-foreground">
              {getOrganizationTypeLabel(
                workspace.organization.organizationType,
              )}{" "}
              workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
              Settings
            </h1>
          </header>

          <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-accent">
                  <Settings aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    Organization profile
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Core workspace details used across SettleHQ.
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-4">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Name
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {workspace.organization.name}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Type
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {getOrganizationTypeLabel(
                      workspace.organization.organizationType,
                    )}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Email
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {workspace.organization.email || "Not provided"}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Phone
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {workspace.organization.phone || "Not provided"}
                  </dd>
                </div>
              </dl>
            </section>

            <aside className="grid gap-5">
              <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Collection wallet</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Managed by SettleHQ for invoice collections.
                    </p>
                  </div>
                  <WalletCards aria-hidden="true" className="text-accent" />
                </div>
                <div className="mt-5 rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">Wallet status</p>
                    <Badge variant={walletActive ? "secondary" : "outline"}>
                      {walletActive ? "Active" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Withdrawal account
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      External bank details for payouts.
                    </p>
                  </div>
                  <Landmark aria-hidden="true" className="text-accent" />
                </div>
                <div className="mt-5 rounded-lg border border-border bg-muted p-4">
                  <p className="font-medium">Not configured</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Bank details will be captured when withdrawal setup is
                    enabled for your workspace.
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
