import { ArrowLeft, FileText, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { generateInvoicesAction } from "@/app/collections/actions";
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
import { getCollectionForOrganization } from "@/server/collections";
import { requireActiveWorkspace } from "@/server/current-workspace";
import { listInvoicesForCollection } from "@/server/invoices";

type CollectionDetailPageProps = {
  params: Promise<{ collectionId: string }>;
};

function getStatusBadgeVariant(status: string) {
  if (status === "pending") {
    return "outline";
  }

  return status === "paid" ? "secondary" : "outline";
}

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
  const generatedInvoiceCount = invoiceRows.length;
  const expectedTotalKobo =
    generatedInvoiceCount > 0
      ? invoiceRows.reduce((total, invoice) => total + invoice.amountDueKobo, 0)
      : collection.amountKobo * assignedPayers.length;
  const amountPaidKobo = invoiceRows.reduce(
    (total, invoice) => total + invoice.amountPaidKobo,
    0,
  );
  const outstandingKobo = Math.max(expectedTotalKobo - amountPaidKobo, 0);
  const collectionRate = expectedTotalKobo
    ? Math.round((amountPaidKobo / expectedTotalKobo) * 100)
    : 0;
  const canGenerateInvoices = generatedInvoiceCount < assignedPayers.length;

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
              {collection.status === "draft"
                ? "Generate invoices to activate this collection and create one obligation per assigned payer."
                : "Active collection with generated invoices. Payment instructions are added in the next milestone."}
            </p>
          </div>

          {canGenerateInvoices ? (
            <form action={generateInvoicesAction}>
              <input type="hidden" name="collectionId" value={collection.id} />
              <button
                type="submit"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                <FileText data-icon="inline-start" />
                {collection.status === "draft"
                  ? "Generate invoices"
                  : "Generate missing invoices"}
              </button>
            </form>
          ) : null}
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Expected total", formatKoboAsNaira(expectedTotalKobo)],
            ["Collected", formatKoboAsNaira(amountPaidKobo)],
            ["Outstanding", formatKoboAsNaira(outstandingKobo)],
            ["Collection rate", `${collectionRate}%`],
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
                    Generated invoices
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">
                    {generatedInvoiceCount}
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
                <CardTitle>
                  {generatedInvoiceCount > 0 ? "Invoices" : "Assigned payers"}
                </CardTitle>
                <CardDescription>
                  {generatedInvoiceCount > 0
                    ? "Each invoice represents one payer obligation in this collection."
                    : "These payers will receive invoices when the collection is activated."}
                </CardDescription>
              </div>
              <UsersRound aria-hidden="true" className="text-accent" />
            </CardHeader>
            <CardContent>
              {generatedInvoiceCount > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
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
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(invoice.status)}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatKoboAsNaira(invoice.amountDueKobo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>External ID</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedPayers.map((payer) => (
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
                          {payer.externalId || "None"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payer.email || payer.phone || "Not provided"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatKoboAsNaira(collection.amountKobo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Payment instructions</CardTitle>
              <CardDescription>
                Nomba virtual accounts and checkout links are intentionally
                next.
              </CardDescription>
            </div>
            <FileText aria-hidden="true" className="text-accent" />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
              Generated invoices create the obligation records. The next
              milestone will attach Nomba-powered payment options to each
              invoice.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
