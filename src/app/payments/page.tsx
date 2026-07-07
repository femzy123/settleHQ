import {
  ExternalLink,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-sidebar";
import { ReceiptViewer } from "@/components/receipt-viewer";
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
import { requireActiveWorkspace } from "@/server/current-workspace";
import {
  formatPaymentMethodLabel,
  getPaymentOverview,
  listPaymentRecords,
} from "@/server/payment-records";

const paymentMethods = ["all", "card", "transfer", "unknown"];
const paymentStatuses = ["all", "verified", "pending", "failed"];

type PaymentsPageProps = {
  searchParams?: Promise<{
    q?: string;
    method?: string;
    status?: string;
  }>;
};

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusBadgeVariant(status: string) {
  if (status === "verified") {
    return "default";
  }

  if (status === "failed") {
    return "destructive";
  }

  return "outline";
}

function normalizeOption(value: string | undefined, options: string[]) {
  return value && options.includes(value) ? value : "all";
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const method = normalizeOption(resolvedSearchParams?.method, paymentMethods);
  const status = normalizeOption(resolvedSearchParams?.status, paymentStatuses);
  const [overview, paymentRows] = await Promise.all([
    getPaymentOverview(workspace.organization.id),
    listPaymentRecords(workspace.organization.id, {
      query,
      method,
      status,
    }),
  ]);

  return (
    <AppShell
      activeItem="Payments"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-border pb-5">
          <p className="text-sm font-medium text-muted-foreground">
            {workspace.organization.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review money received through Nomba Checkout, matched invoices, and
            issued receipts.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overview.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {card.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.helper}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Payment ledger</CardTitle>
                <CardDescription>
                  Search by payer, invoice, collection, payment ID, or Nomba
                  reference.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="text-primary" />
                Read-only records
              </div>
            </div>
            <form
              action="/payments"
              className="grid w-full gap-2 md:grid-cols-4"
            >
              <div className="relative md:col-span-2">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  name="q"
                  defaultValue={query}
                  className="pl-9"
                  placeholder="Payer, invoice, collection, payment ID, reference"
                />
              </div>
              <select
                name="method"
                defaultValue={method}
                className="h-11 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                {paymentMethods.map((methodOption) => (
                  <option key={methodOption} value={methodOption}>
                    {methodOption === "all"
                      ? "All methods"
                      : formatPaymentMethodLabel(methodOption)}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={status}
                className="h-11 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                {paymentStatuses.map((statusOption) => (
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
            {paymentRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRows.map((payment) => {
                    const receiptViewerData = payment.receipt
                      ? {
                          organizationName: workspace.organization.name,
                          receiptNumber: payment.receipt.receiptNumber,
                          invoiceNumber: payment.invoice.invoiceNumber,
                          payerName: payment.payer.fullName,
                          collectionName: payment.collection.name,
                          amountLabel: formatKoboAsNaira(
                            payment.receipt.amountKobo,
                            payment.receipt.currency,
                          ),
                          paymentMethod: formatPaymentMethodLabel(
                            payment.paymentMethod,
                          ),
                          paymentReference: payment.providerReference,
                          paidAtLabel: formatDate(payment.paidAt),
                          issuedAtLabel: formatDate(payment.receipt.issuedAt),
                        }
                      : null;

                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>Payment #{payment.id}</span>
                            <span className="max-w-56 truncate text-xs text-muted-foreground">
                              {payment.providerReference}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/payers/${payment.payer.id}`}
                              className="font-medium hover:underline"
                            >
                              {payment.payer.fullName}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {payment.payer.email ||
                                payment.payer.externalId ||
                                "No contact saved"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/invoices/${payment.invoice.id}`}
                            className="font-medium hover:underline"
                          >
                            {payment.invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/collections/${payment.collection.id}`}
                            className="hover:underline"
                          >
                            {payment.collection.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {formatPaymentMethodLabel(payment.paymentMethod)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(
                              payment.verificationStatus,
                            )}
                          >
                            {getStatusLabel(payment.verificationStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.paidAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatKoboAsNaira(
                            payment.amountKobo,
                            payment.currency,
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/invoice/${payment.invoice.publicToken}`}
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                }),
                              )}
                              target="_blank"
                            >
                              Invoice
                              <ExternalLink
                                aria-hidden="true"
                                data-icon="inline-end"
                              />
                            </Link>
                            {receiptViewerData ? (
                              <ReceiptViewer receipt={receiptViewerData} />
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-6 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-lg bg-surface text-accent shadow-[var(--shadow-soft)]">
                  <WalletCards aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">No payments yet</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Payments will appear here after a payer completes Checkout and
                  SettleHQ verifies the confirmation.
                </p>
                <Link
                  href="/invoices"
                  className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
                >
                  View invoices
                  <ReceiptText aria-hidden="true" data-icon="inline-end" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
