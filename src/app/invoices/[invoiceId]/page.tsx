import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-sidebar";
import { ReceiptViewer } from "@/components/receipt-viewer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { runtimeEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import { formatDate, formatKoboAsNaira } from "@/lib/money";
import { formatPaymentMethodLabel } from "@/server/payment-records";
import { requireActiveWorkspace } from "@/server/current-workspace";
import {
  getActiveCheckoutForInvoice,
  getInvoiceForOrganization,
  listReceiptsForInvoice,
} from "@/server/invoices";

type InvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const { invoiceId: rawInvoiceId } = await params;
  const invoiceId = Number(rawInvoiceId);

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    notFound();
  }

  const invoice = await getInvoiceForOrganization(
    workspace.organization.id,
    invoiceId,
  );

  if (!invoice) {
    notFound();
  }

  const [checkout, receiptRows] = await Promise.all([
    getActiveCheckoutForInvoice(workspace.organization.id, invoice.id),
    listReceiptsForInvoice(workspace.organization.id, invoice.id),
  ]);
  const latestReceipt = receiptRows[0] ?? null;
  const outstandingKobo = Math.max(
    invoice.amountDueKobo - invoice.amountPaidKobo,
    0,
  );
  const isPaid = invoice.status === "paid" || outstandingKobo === 0;
  const publicPath = `/invoice/${invoice.publicToken}`;
  const publicUrl = runtimeEnv.appUrl
    ? `${runtimeEnv.appUrl.replace(/\/$/, "")}${publicPath}`
    : publicPath;
  const receiptViewerData = latestReceipt
    ? {
        organizationName: workspace.organization.name,
        receiptNumber: latestReceipt.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        payerName: invoice.payer.fullName,
        collectionName: invoice.collection.name,
        amountLabel: formatKoboAsNaira(
          latestReceipt.amountKobo,
          latestReceipt.currency,
        ),
        paymentMethod: formatPaymentMethodLabel(
          latestReceipt.payment.paymentMethod,
        ),
        paymentReference: latestReceipt.payment.providerReference,
        paidAtLabel: formatDate(latestReceipt.payment.paidAt),
        issuedAtLabel: formatDate(latestReceipt.issuedAt),
      }
    : null;

  return (
    <AppShell
      activeItem="Invoices"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-border pb-5">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" />
            Back to invoices
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold md:text-3xl">
              {invoice.invoiceNumber}
            </h1>
            <Badge variant={isPaid ? "default" : "outline"}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Specific invoice for {invoice.payer.fullName} from{" "}
            {invoice.collection.name}.
          </p>
        </header>

        {isPaid ? (
          <Card className="border-primary/35 bg-primary/10">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 text-primary"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    Payment verified
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {latestReceipt
                      ? `Receipt ${latestReceipt.receiptNumber} has been issued for this invoice.`
                      : "This invoice is paid. Receipt details will appear once issued."}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {formatKoboAsNaira(invoice.amountPaidKobo, invoice.currency)}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Amount due", formatKoboAsNaira(invoice.amountDueKobo)],
            ["Amount paid", formatKoboAsNaira(invoice.amountPaidKobo)],
            ["Outstanding", formatKoboAsNaira(outstandingKobo)],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
              <CardDescription>
                Obligation details generated from the collection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Payer</dt>
                  <dd className="mt-1 font-medium">
                    <Link
                      href={`/payers/${invoice.payer.id}`}
                      className="hover:underline"
                    >
                      {invoice.payer.fullName}
                    </Link>
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">Collection</dt>
                  <dd className="mt-1 font-medium">
                    <Link
                      href={`/collections/${invoice.collection.id}`}
                      className="hover:underline"
                    >
                      {invoice.collection.name}
                    </Link>
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">Due date</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(invoice.dueDate)}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">Contact</dt>
                  <dd className="mt-1 font-medium">
                    {invoice.payer.email ||
                      invoice.payer.phone ||
                      "Not provided"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Public invoice URL</CardTitle>
                  <CardDescription>
                    Share this page with the payer. The Pay button lives there,
                    not in the internal dashboard.
                  </CardDescription>
                </div>
                <Link
                  href={publicPath}
                  className={cn(buttonVariants({ variant: "outline" }))}
                  target="_blank"
                >
                  Open page
                  <ExternalLink aria-hidden="true" data-icon="inline-end" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <p className="text-sm text-muted-foreground">Public URL</p>
                    <p className="mt-2 break-all text-sm font-medium">
                      {publicUrl}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <p className="text-sm text-muted-foreground">
                      Checkout status
                    </p>
                    <p className="mt-2 font-medium">
                      {isPaid
                        ? "Payment verified"
                        : checkout?.checkoutUrl
                          ? "Checkout ready"
                          : "Not opened yet"}
                    </p>
                    {checkout?.orderReference ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reference: {checkout.orderReference}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Receipt</CardTitle>
                  <CardDescription>
                    Verified receipt linked to this invoice payment.
                  </CardDescription>
                </div>
                <ReceiptText aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                {latestReceipt ? (
                  <div className="rounded-lg border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Receipt number
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {latestReceipt.receiptNumber}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Paid {formatDate(latestReceipt.payment.paidAt)} via{" "}
                          {formatPaymentMethodLabel(
                            latestReceipt.payment.paymentMethod,
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        <p className="text-xl font-semibold tabular-nums">
                          {formatKoboAsNaira(
                            latestReceipt.amountKobo,
                            latestReceipt.currency,
                          )}
                        </p>
                        {receiptViewerData ? (
                          <ReceiptViewer receipt={receiptViewerData} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                    No receipt has been issued for this invoice yet.
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
