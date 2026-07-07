import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  ExternalLink,
  FileText,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { Separator } from "@/components/ui/separator";
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
import { getPayerDetailData } from "@/server/payer-detail";
import { getPayerForOrganization } from "@/server/payers";
import { formatPaymentMethodLabel } from "@/server/payment-records";

type PayerDetailPageProps = {
  params: Promise<{ payerId: string }>;
};

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusBadgeVariant(status: string) {
  if (status === "paid" || status === "verified") {
    return "default";
  }

  if (status === "failed" || status === "overdue") {
    return "destructive";
  }

  return status === "pending" ? "outline" : "secondary";
}

export default async function PayerDetailPage({
  params,
}: PayerDetailPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const { payerId: rawPayerId } = await params;
  const payerId = Number(rawPayerId);

  if (!Number.isInteger(payerId) || payerId <= 0) {
    notFound();
  }

  const payer = await getPayerForOrganization(
    workspace.organization.id,
    payerId,
  );

  if (!payer) {
    notFound();
  }

  const payerData = await getPayerDetailData(
    workspace.organization.id,
    payerId,
  );
  const outstandingInvoices = payerData.invoices.filter((invoice) => {
    const outstandingKobo = Math.max(
      invoice.amountDueKobo - invoice.amountPaidKobo,
      0,
    );

    return (
      outstandingKobo > 0 && !["paid", "cancelled"].includes(invoice.status)
    );
  });
  const summaryCards = [
    {
      label: "Total invoiced",
      value: formatKoboAsNaira(payerData.summary.totalInvoicedKobo),
      helper: `${payerData.summary.invoiceCount} invoice${payerData.summary.invoiceCount === 1 ? "" : "s"}`,
    },
    {
      label: "Total paid",
      value: formatKoboAsNaira(payerData.summary.totalPaidKobo),
      helper: `${payerData.summary.paymentCount} payment${payerData.summary.paymentCount === 1 ? "" : "s"}`,
    },
    {
      label: "Outstanding",
      value: formatKoboAsNaira(payerData.summary.outstandingKobo),
      helper:
        payerData.summary.outstandingKobo > 0
          ? "Needs follow-up"
          : "Nothing outstanding",
    },
    {
      label: "Paid invoices",
      value: `${payerData.summary.paidInvoiceCount}/${payerData.summary.invoiceCount}`,
      helper: "Settled invoice count",
    },
  ];

  return (
    <AppShell
      activeItem="Payers"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/payers"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" />
              Back to payers
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {payer.fullName}
              </h1>
              {payer.externalId ? (
                <Badge variant="outline">{payer.externalId}</Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Payer profile for {workspace.organization.name}.
            </p>
          </div>
          <Link
            href={`/payers/${payer.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            <Edit data-icon="inline-start" />
            Edit payer
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
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

        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
              <CardDescription>
                Details used to identify the payer across collections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd className="mt-1 font-medium">
                    {payer.email || "Not provided"}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">Phone</dt>
                  <dd className="mt-1 font-medium">
                    {payer.phone || "Not provided"}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">External ID</dt>
                  <dd className="mt-1 font-medium">
                    {payer.externalId || "Not provided"}
                  </dd>
                </div>
              <Separator />
              <div>
                <dt className="text-sm text-muted-foreground">
                  Payment account
                </dt>
                <dd className="mt-2 rounded-lg border border-border bg-muted/35 p-4">
                  {payerData.virtualAccount?.status === "active" ? (
                    <div className="space-y-2">
                      <Badge variant="default">Active</Badge>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {payerData.virtualAccount.bankName || "Bank"}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {payerData.virtualAccount.accountNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {payerData.virtualAccount.accountName || payer.fullName}
                        </p>
                      </div>
                    </div>
                  ) : payerData.virtualAccount ? (
                    <div className="space-y-2">
                      <Badge variant="secondary">
                        {getStatusLabel(payerData.virtualAccount.status)}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        A dedicated payment account will be prepared when this payer opens an invoice.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No dedicated payment account has been created yet.
                    </p>
                  )}
                </dd>
              </div>                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(payer.createdAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:col-span-2">
            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Outstanding obligations</CardTitle>
                  <CardDescription>
                    Unpaid or partially paid invoices generated for this payer.
                  </CardDescription>
                </div>
                <WalletCards aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                {outstandingInvoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Collection</TableHead>
                          <TableHead>Due date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">
                            Outstanding
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outstandingInvoices.map((invoice) => {
                          const outstandingKobo = Math.max(
                            invoice.amountDueKobo - invoice.amountPaidKobo,
                            0,
                          );

                          return (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/invoices/${invoice.id}`}
                                  className="hover:underline"
                                >
                                  {invoice.invoiceNumber}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/collections/${invoice.collection.id}`}
                                  className="hover:underline"
                                >
                                  {invoice.collection.name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {formatDate(invoice.dueDate)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStatusBadgeVariant(
                                    invoice.status,
                                  )}
                                >
                                  {getStatusLabel(invoice.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatKoboAsNaira(
                                  outstandingKobo,
                                  invoice.currency,
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Link
                                    href={`/invoices/${invoice.id}`}
                                    className={cn(
                                      buttonVariants({
                                        variant: "outline",
                                        size: "sm",
                                      }),
                                    )}
                                  >
                                    View
                                  </Link>
                                  <Link
                                    href={`/invoice/${invoice.publicToken}`}
                                    className={cn(
                                      buttonVariants({
                                        variant: "outline",
                                        size: "sm",
                                      }),
                                    )}
                                    target="_blank"
                                  >
                                    Public
                                    <ExternalLink
                                      aria-hidden="true"
                                      data-icon="inline-end"
                                    />
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                    This payer has no outstanding invoices. New obligations will
                    appear here after invoices are sent from a collection.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Invoice history</CardTitle>
                  <CardDescription>
                    Every invoice generated for this payer across collections.
                  </CardDescription>
                </div>
                <FileText aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                {payerData.invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Collection</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Due</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payerData.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="hover:underline"
                              >
                                {invoice.invoiceNumber}
                              </Link>
                            </TableCell>
                            <TableCell>{invoice.collection.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(invoice.status)}
                              >
                                {getStatusLabel(invoice.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatKoboAsNaira(
                                invoice.amountDueKobo,
                                invoice.currency,
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatKoboAsNaira(
                                invoice.amountPaidKobo,
                                invoice.currency,
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                    No invoices have been generated for this payer yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Payment and receipt history</CardTitle>
                  <CardDescription>
                    Verified payments and receipts matched to this payer.
                  </CardDescription>
                </div>
                <ReceiptText aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                {payerData.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payerData.payments.map((payment) => {
                          const receiptViewerData = payment.receipt
                            ? {
                                organizationName: workspace.organization.name,
                                receiptNumber: payment.receipt.receiptNumber,
                                invoiceNumber: payment.invoice.invoiceNumber,
                                payerName: payer.fullName,
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
                                issuedAtLabel: formatDate(
                                  payment.receipt.issuedAt,
                                ),
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
                                <Link
                                  href={`/invoices/${payment.invoice.id}`}
                                  className="hover:underline"
                                >
                                  {payment.invoice.invoiceNumber}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {formatPaymentMethodLabel(
                                  payment.paymentMethod,
                                )}
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
                              <TableCell>
                                {formatDate(payment.paidAt)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatKoboAsNaira(
                                  payment.amountKobo,
                                  payment.currency,
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end">
                                  {receiptViewerData ? (
                                    <ReceiptViewer
                                      receipt={receiptViewerData}
                                    />
                                  ) : (
                                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                      <CheckCircle2
                                        aria-hidden="true"
                                        className="text-primary"
                                      />
                                      Verified
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                    No payments have been matched to this payer yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
