import { ArrowLeft, FileText, UsersRound } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatKoboAsNaira } from "@/lib/money";
import { getCollectionForOrganization } from "@/server/collections";
import { requireActiveWorkspace } from "@/server/current-workspace";

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

  const detail = await getCollectionForOrganization(
    workspace.organization.id,
    collectionId,
  );

  if (!detail) {
    notFound();
  }

  const { collection, assignedPayers } = detail;
  const expectedTotalKobo = collection.amountKobo * assignedPayers.length;

  return (
    <AppShell
      activeItem="Collections"
      userEmail={user.email}
      userName={user.fullName}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-border pb-5">
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
            Draft collection for {workspace.organization.name}. Payment
            instructions will be generated after invoice generation is added.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Expected total", formatKoboAsNaira(expectedTotalKobo)],
            ["Collected", "NGN 0"],
            ["Outstanding", formatKoboAsNaira(expectedTotalKobo)],
            ["Collection rate", "0%"],
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
                Current draft details before invoices are generated.
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
                  These payers will receive invoices when this collection is
                  activated in the next workflow.
                </CardDescription>
              </div>
              <UsersRound aria-hidden="true" className="text-accent" />
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Invoice generation</CardTitle>
              <CardDescription>
                This milestone stops at draft collections and payer assignment.
              </CardDescription>
            </div>
            <FileText aria-hidden="true" className="text-accent" />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
              Invoices, payment instructions, virtual accounts, checkout links,
              and Nomba calls will be added in the next milestone.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
