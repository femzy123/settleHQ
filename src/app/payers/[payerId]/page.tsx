import { ArrowLeft, Edit, ReceiptText, WalletCards } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { cn } from "@/lib/utils";
import { requireActiveWorkspace } from "@/server/current-workspace";
import { getPayerForOrganization } from "@/server/payers";

type PayerDetailPageProps = {
  params: Promise<{ payerId: string }>;
};

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

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card>
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
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card>
              <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Outstanding obligations</CardTitle>
                  <CardDescription>
                    Invoices generated from collections will appear here.
                  </CardDescription>
                </div>
                <WalletCards aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                  No outstanding invoices yet. Create a collection and assign
                  this payer to start tracking obligations.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Payment and receipt history</CardTitle>
                  <CardDescription>
                    Confirmed payments and generated receipts will be listed
                    after invoice payment options are enabled.
                  </CardDescription>
                </div>
                <ReceiptText aria-hidden="true" className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
                  No payments have been matched to this payer yet.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
