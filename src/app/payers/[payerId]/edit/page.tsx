import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveWorkspace } from "@/server/current-workspace";
import { getPayerForOrganization } from "@/server/payers";

import { PayerForm } from "../../payer-form";

type EditPayerPageProps = {
  params: Promise<{ payerId: string }>;
};

export default async function EditPayerPage({ params }: EditPayerPageProps) {
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
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-5">
          <p className="text-sm font-medium text-muted-foreground">
            {workspace.organization.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
            Edit payer
          </h1>
        </header>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{payer.fullName}</CardTitle>
            <CardDescription>
              Update the contact and reference details for this payer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayerForm mode="edit" initialValues={payer} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
