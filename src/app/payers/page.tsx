import { Plus, Search, UsersRound } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listPayers } from "@/server/payers";
import { requireActiveWorkspace } from "@/server/current-workspace";

type PayersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function PayersPage({ searchParams }: PayersPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const payerRows = await listPayers(workspace.organization.id, query);

  return (
    <AppShell
      activeItem="Payers"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {workspace.organization.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Payers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage the people or entities that owe your organization money.
            </p>
          </div>
          <Link
            href="/payers/new"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            <Plus data-icon="inline-start" />
            Add payer
          </Link>
        </header>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Payer directory</CardTitle>
              <CardDescription>
                Search by name, contact details, or external ID.
              </CardDescription>
            </div>
            <form action="/payers" className="flex w-full gap-2 sm:w-80">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  name="q"
                  defaultValue={query}
                  className="pl-9"
                  placeholder="Search payers"
                />
              </div>
            </form>
          </CardHeader>
          <CardContent>
            {payerRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Last payment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payerRows.map((payer) => (
                    <TableRow key={payer.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/payers/${payer.id}`}
                          className="hover:underline"
                        >
                          {payer.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payer.email || payer.phone || "Not provided"}
                      </TableCell>
                      <TableCell>
                        {payer.externalId ? (
                          <Badge variant="outline">{payer.externalId}</Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">NGN 0</TableCell>
                      <TableCell className="text-muted-foreground">
                        No payments yet
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/payers/${payer.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                          )}
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-6 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-lg bg-surface text-accent shadow-[var(--shadow-soft)]">
                  <UsersRound aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {query ? "No matching payers" : "No payers yet"}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {query
                    ? "Try another search term or clear the search to see every payer."
                    : "Add your first payer before creating a collection."}
                </p>
                <Link
                  href="/payers/new"
                  className={cn(buttonVariants({ className: "mt-5" }))}
                >
                  <Plus data-icon="inline-start" />
                  Add payer
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
