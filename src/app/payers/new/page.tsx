import { AppShell } from "@/components/app-sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveWorkspace } from "@/server/current-workspace";

import { PayerForm } from "../payer-form";

export default async function NewPayerPage() {
  const { user, workspace } = await requireActiveWorkspace();

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
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Add payer</h1>
        </header>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payer details</CardTitle>
            <CardDescription>
              Add the contact and reference details your finance team uses to
              identify this payer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayerForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
