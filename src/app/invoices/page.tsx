import { FileText, Search } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
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
import { requireActiveWorkspace } from "@/server/current-workspace";
import { listInvoices } from "@/server/invoices";

const invoiceStatuses = [
  "all",
  "pending",
  "paid",
  "overdue",
  "reconciliation_required",
  "cancelled",
];

type InvoicesPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>;
};

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusBadgeVariant(status: string) {
  return status === "pending" ? "outline" : "secondary";
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const status = resolvedSearchParams?.status ?? "all";
  const invoiceRows = await listInvoices(workspace.organization.id, {
    query,
    status,
  });

  return (
    <AppShell
      activeItem="Invoices"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-border pb-5">
          <p className="text-sm font-medium text-muted-foreground">
            {workspace.organization.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Invoices</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track individual obligations generated from active collections.
          </p>
        </header>

        <Card>
          <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Invoice register</CardTitle>
              <CardDescription>
                Search by invoice number, payer, or collection.
              </CardDescription>
            </div>
            <form
              action="/invoices"
              className="grid w-full gap-2 sm:grid-cols-[1fr_190px] xl:w-[560px]"
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
                  placeholder="Search invoices"
                />
              </div>
              <select
                name="status"
                defaultValue={status}
                className="h-11 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                {invoiceStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption === "all"
                      ? "All statuses"
                      : getStatusLabel(statusOption)}
                  </option>
                ))}
              </select>
            </form>
          </CardHeader>
          <CardContent>
            {invoiceRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment method</TableHead>
                    <TableHead className="text-right">Amount due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceRows.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.payer.fullName}</TableCell>
                      <TableCell>
                        <Link
                          href={`/collections/${invoice.collection.id}`}
                          className="hover:underline"
                        >
                          {invoice.collection.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Not generated
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatKoboAsNaira(invoice.amountDueKobo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-6 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-lg bg-surface text-accent shadow-[var(--shadow-soft)]">
                  <FileText aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">No invoices yet</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Generate invoices from a draft collection to create individual
                  payer obligations.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
