import { ListChecks, Plus, Search } from "lucide-react";
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
import { formatDate, formatKoboAsNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import { listCollections } from "@/server/collections";
import { requireActiveWorkspace } from "@/server/current-workspace";

const collectionStatuses = ["all", "draft", "active", "completed", "cancelled"];

type CollectionsPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>;
};

function getStatusBadgeVariant(status: string) {
  return status === "draft" ? "outline" : "secondary";
}

export default async function CollectionsPage({
  searchParams,
}: CollectionsPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const status = resolvedSearchParams?.status ?? "all";
  const collectionRows = await listCollections(workspace.organization.id, {
    query,
    status,
  });

  return (
    <AppShell
      activeItem="Collections"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {workspace.organization.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
              Collections
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create and track financial obligation exercises before invoices
              and payment instructions are generated.
            </p>
          </div>
          <Link
            href="/collections/new"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            <Plus data-icon="inline-start" />
            Create collection
          </Link>
        </header>

        <Card>
          <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Collection exercises</CardTitle>
              <CardDescription>
                Draft collections stay editable until invoice generation is
                added.
              </CardDescription>
            </div>
            <form
              action="/collections"
              className="grid w-full gap-2 sm:grid-cols-[1fr_160px] xl:w-[520px]"
            >
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  name="q"
                  defaultValue={query}
                  className="pl-9"
                  placeholder="Search collections"
                />
              </div>
              <select
                name="status"
                defaultValue={status}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {collectionStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption === "all" ? "All statuses" : statusOption}
                  </option>
                ))}
              </select>
            </form>
          </CardHeader>
          <CardContent>
            {collectionRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payers</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionRows.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/collections/${collection.id}`}
                          className="hover:underline"
                        >
                          {collection.name}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatKoboAsNaira(collection.amountKobo)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {collection.assignedPayerCount}
                      </TableCell>
                      <TableCell className="tabular-nums">NGN 0</TableCell>
                      <TableCell className="tabular-nums">0%</TableCell>
                      <TableCell>{formatDate(collection.dueDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(collection.status)}
                        >
                          {collection.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/collections/${collection.id}`}
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
                  <ListChecks aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {query || status !== "all"
                    ? "No matching collections"
                    : "No collections yet"}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {query || status !== "all"
                    ? "Adjust the search or status filter to find a collection."
                    : "Create a draft collection when you are ready to define an obligation for selected payers."}
                </p>
                <Link
                  href="/collections/new"
                  className={cn(buttonVariants({ className: "mt-5" }))}
                >
                  <Plus data-icon="inline-start" />
                  Create collection
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
