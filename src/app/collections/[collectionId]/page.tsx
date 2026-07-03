import { ArrowLeft, FileText, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectionInvoiceSender } from "@/app/collections/[collectionId]/invoice-sender";
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
import { getCollectionForOrganization } from "@/server/collections";
import { requireActiveWorkspace } from "@/server/current-workspace";
import { listInvoicesForCollection } from "@/server/invoices";

type CollectionDetailPageProps = {
  params: Promise<{ collectionId: string }>;
};

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const { user, workspace } = await requireActiveWorkspace();
  const { collectionId: rawCollectionId } = await params;
  const collectionId = Number(rawCollectionId);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    notFound();
  }

  const [detail, invoiceRows] = await Promise.all([
    getCollectionForOrganization(workspace.organization.id, collectionId),
    listInvoicesForCollection(workspace.organization.id, collectionId),
  ]);

  if (!detail) {
    notFound();
  }

  const { collection, assignedPayers } = detail;
  const invoiceByPayerId = new Map(
    invoiceRows.map((invoice) => [invoice.payerId, invoice]),
  );
  const payerRows = assignedPayers.map((payer) => {
    const invoice = invoiceByPayerId.get(payer.id);

    return {
      ...payer,
      amountLabel: formatKoboAsNaira(collection.amountKobo),
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            publicPath: `/invoice/${invoice.publicToken}`,
          }
        : null,
    };
  });
  const generatedInvoiceCount = invoiceRows.length;
  const expectedTotalKobo = collection.amountKobo * assignedPayers.length;
  const amountPaidKobo = invoiceRows.reduce(
    (total, invoice) => total + invoice.amountPaidKobo,
    0,
  );
  const outstandingKobo = Math.max(expectedTotalKobo - amountPaidKobo, 0);
  const collectionRate = expectedTotalKobo
    ? Math.round((amountPaidKobo / expectedTotalKobo) * 100)
    : 0;
  const awaitingInvoiceCount = Math.max(
    assignedPayers.length - generatedInvoiceCount,
    0,
  );

  return (
    <AppShell
      activeItem="Collections"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" />
              Back to collections
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {collection.name}
              </h1>
              <Badge variant="outline">{collection.status}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Select assigned payers and send their invoice links. Each payer
              receives a unique invoice URL tied to their own obligation.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Expected total", formatKoboAsNaira(expectedTotalKobo)],
            ["Collected", formatKoboAsNaira(amountPaidKobo)],
            ["Outstanding", formatKoboAsNaira(outstandingKobo)],
            ["Awaiting invoice", String(awaitingInvoiceCount)],
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
              <CardTitle>Collection setup</CardTitle>
              <CardDescription>
                Current obligation details for this collection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Amount per payer
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">
                    {formatKoboAsNaira(collection.amountKobo)}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">Due date</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(collection.dueDate)}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Assigned payers
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">
                    {assignedPayers.length}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Sent invoices
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">
                    {generatedInvoiceCount}
                  </dd>
                </div>
                <Separator />
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Collection rate
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">
                    {collectionRate}%
                  </dd>
                </div>
                {collection.description ? (
                  <>
                    <Separator />
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Description
                      </dt>
                      <dd className="mt-1 text-sm leading-6">
                        {collection.description}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Assigned payers</CardTitle>
                <CardDescription>
                  Select payers and send invoice links. Already-sent invoices
                  are protected from duplicate generation.
                </CardDescription>
              </div>
              <UsersRound aria-hidden="true" className="text-accent" />
            </CardHeader>
            <CardContent>
              <CollectionInvoiceSender
                collectionId={collection.id}
                rows={payerRows}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Invoice delivery</CardTitle>
              <CardDescription>
                Email delivery is deferred; generated invoice links are logged
                in the server console for now.
              </CardDescription>
            </div>
            <FileText aria-hidden="true" className="text-accent" />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
              Each selected payer gets their own invoice record and public URL.
              The Pay button appears on that payer-specific public invoice page.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
