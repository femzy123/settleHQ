import { Plus, UsersRound } from "lucide-react";
import Link from "next/link";

import { CollectionForm } from "@/app/collections/collection-form";
import { AppShell } from "@/components/app-sidebar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireActiveWorkspace } from "@/server/current-workspace";
import { listPayers } from "@/server/payers";

export default async function NewCollectionPage() {
  const { user, workspace } = await requireActiveWorkspace();
  const payers = await listPayers(workspace.organization.id);

  return (
    <AppShell
      activeItem="Collections"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-border pb-5">
          <p className="text-sm font-medium text-muted-foreground">
            {workspace.organization.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
            Create collection
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with a draft collection. Invoice generation and payment
            instructions come next.
          </p>
        </header>

        <div className="mt-6">
          {payers.length > 0 ? (
            <CollectionForm payers={payers} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No payers available</CardTitle>
                <CardDescription>
                  Add at least one payer before creating a collection.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-6 py-12 text-center">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-surface text-accent shadow-[var(--shadow-soft)]">
                    <UsersRound aria-hidden="true" />
                  </div>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                    Payers are the people or entities that will receive invoices
                    when this collection becomes active.
                  </p>
                  <Link
                    href="/payers/new"
                    className={cn(buttonVariants({ className: "mt-5" }))}
                  >
                    <Plus data-icon="inline-start" />
                    Add payer
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
