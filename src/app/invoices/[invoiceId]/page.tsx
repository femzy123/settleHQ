import { ArrowLeft, CreditCard, Landmark, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatKoboAsNaira } from "@/lib/money";
import { requireActiveWorkspace } from "@/server/current-workspace";
import { getInvoiceForOrganization } from "@/server/invoices";

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

  const outstandingKobo = Math.max(
    invoice.amountDueKobo - invoice.amountPaidKobo,
    0,
  );

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
            <Badge variant="outline">{getStatusLabel(invoice.status)}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invoice for {invoice.payer.fullName} from {invoice.collection.name}.
          </p>
        </header>

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
              <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Payment method</CardTitle>
                  <CardDescription>
                    Nomba payment options will be attached to this invoice next.
                  </CardDescription>
                </div>
                <CreditCard aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Landmark aria-hidden="true" />
                      Bank transfer
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Temporary virtual account details will appear here after
                      Nomba payment options are enabled.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <CreditCard aria-hidden="true" />
                      Checkout
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Card, transfer, USSD, or QR checkout instructions will be
                      added in the payment option milestone.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Receipt</CardTitle>
                  <CardDescription>
                    Receipts are issued after a verified payment is reconciled.
                  </CardDescription>
                </div>
                <ReceiptText aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                  No receipt has been issued for this invoice yet.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
