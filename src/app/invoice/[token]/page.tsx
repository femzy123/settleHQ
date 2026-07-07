import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  ReceiptText,
} from "lucide-react";
import { notFound } from "next/navigation";

import { ReceiptViewer } from "@/components/receipt-viewer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatKoboAsNaira } from "@/lib/money";
import { formatPaymentMethodLabel } from "@/server/payment-records";
import {
  getActiveCheckoutForInvoice,
  getPublicInvoiceByToken,
  listReceiptsForInvoice,
} from "@/server/invoices";

import { payInvoiceAction } from "./actions";
import { PaymentVerificationModal } from "./payment-verification-modal";

type PublicInvoicePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusVariant(status: string) {
  if (status === "paid") {
    return "default";
  }

  return status === "pending" ? "outline" : "secondary";
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: PublicInvoicePageProps) {
  const { token } = await params;
  const query = (await searchParams) ?? {};
  const invoice = await getPublicInvoiceByToken(token);

  if (!invoice) {
    notFound();
  }

  const [checkout, receiptRows] = await Promise.all([
    getActiveCheckoutForInvoice(invoice.organizationId, invoice.id),
    listReceiptsForInvoice(invoice.organizationId, invoice.id),
  ]);
  const latestReceipt = receiptRows[0] ?? null;
  const outstandingKobo = Math.max(
    invoice.amountDueKobo - invoice.amountPaidKobo,
    0,
  );
  const isPaid = invoice.status === "paid" || outstandingKobo === 0;
  const isPayable =
    outstandingKobo > 0 && !["paid", "cancelled"].includes(invoice.status);
  const shouldVerifyPayment =
    getQueryValue(query.checkout_return) === "1" && isPayable;
  const showPendingVerification =
    getQueryValue(query.payment_pending) === "1" && isPayable;
  const receiptViewerData = latestReceipt
    ? {
        organizationName: invoice.organization.name,
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white dark:text-primary-foreground">
              <Building2 aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">{invoice.organization.name}</p>
              <p className="text-sm text-muted-foreground">
                Invoice powered by SettleHQ
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[1fr_360px] lg:items-start lg:py-12">
          <div className="flex flex-col gap-5">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/35">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardDescription>
                      Invoice issued to {invoice.payer.fullName}
                    </CardDescription>
                    <CardTitle className="mt-2 text-2xl md:text-3xl">
                      {invoice.invoiceNumber}
                    </CardTitle>
                  </div>
                  <Badge variant={getStatusVariant(invoice.status)}>
                    {getStatusLabel(invoice.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 p-5 sm:p-6">
                {isPaid ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <CheckCircle2
                        aria-hidden="true"
                        className="text-primary"
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          Payment confirmed
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This invoice has been settled and a receipt has been
                          issued.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-sm text-muted-foreground">
                    {isPaid ? "Amount paid" : "Amount to settle"}
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
                    {formatKoboAsNaira(
                      isPaid ? invoice.amountPaidKobo : outstandingKobo,
                      invoice.currency,
                    )}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-sm text-muted-foreground">Issued to</p>
                    <p className="mt-1 font-medium">{invoice.payer.fullName}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-sm text-muted-foreground">Collection</p>
                    <p className="mt-1 font-medium">
                      {invoice.collection.name}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-sm text-muted-foreground">Due date</p>
                    <p className="mt-1 font-medium">
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <p className="text-sm text-muted-foreground">Amount due</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatKoboAsNaira(
                        invoice.amountDueKobo,
                        invoice.currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <p className="text-sm text-muted-foreground">Amount paid</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatKoboAsNaira(
                        invoice.amountPaidKobo,
                        invoice.currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatKoboAsNaira(outstandingKobo, invoice.currency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showPendingVerification ? (
              <Card className="border-accent/45 bg-accent/10">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Payment verification is still in progress.
                  </p>
                  <p className="mt-2 leading-6">
                    Your payment was submitted. This invoice will be marked as
                    paid and the receipt will appear once confirmation is
                    completed.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Receipt</CardTitle>
                  <CardDescription>
                    Proof of payment for this specific invoice.
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

          <aside className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isPaid ? "Payment complete" : "Pay securely"}
                </CardTitle>
                <CardDescription>
                  {isPaid
                    ? "SettleHQ has verified this payment."
                    : "Nomba Checkout supports card and bank transfer."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-lg border border-border bg-muted/35 p-4">
                  <div className="flex items-center gap-2 font-medium">
                    {isPaid ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <Clock3 aria-hidden="true" />
                    )}
                    {isPaid ? "Receipt status" : "Checkout status"}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isPaid && latestReceipt
                      ? `Receipt ${latestReceipt.receiptNumber} has been issued.`
                      : checkout?.checkoutUrl
                        ? "A Checkout order is ready for this invoice."
                        : "A Checkout order will be created for this invoice when you click Pay."}
                  </p>
                </div>

                {isPayable ? (
                  <form action={payInvoiceAction}>
                    <input type="hidden" name="token" value={token} />
                    <Button type="submit" size="lg" className="h-11 w-full">
                      Pay {formatKoboAsNaira(outstandingKobo, invoice.currency)}
                      <ArrowRight aria-hidden="true" data-icon="inline-end" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-4 text-sm font-medium">
                    <CheckCircle2 aria-hidden="true" className="text-primary" />
                    {isPaid
                      ? "This invoice has been paid."
                      : "This invoice is not payable."}
                  </div>
                )}

                <Separator />

                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ReceiptText
                    aria-hidden="true"
                    className="mt-0.5 text-accent"
                  />
                  <p>
                    After payment is verified, SettleHQ updates this invoice and
                    issues a receipt.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>

      {shouldVerifyPayment ? (
        <PaymentVerificationModal publicToken={token} />
      ) : null}
    </main>
  );
}
