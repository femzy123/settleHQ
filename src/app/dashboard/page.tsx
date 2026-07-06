import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getOrganizationTypeLabel } from "@/lib/organizations";
import { getDashboardData } from "@/server/dashboard";
import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export default async function DashboardPage() {
  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  const dashboard = await getDashboardData(workspace.organization.id);

  return (
    <DashboardShell
      organizationName={workspace.organization.name}
      organizationTypeLabel={getOrganizationTypeLabel(
        workspace.organization.organizationType,
      )}
      userEmail={user.email}
      userName={user.fullName}
      metrics={dashboard.metrics}
      outstandingCollections={dashboard.outstandingCollections}
      activity={dashboard.activity}
      reconciliation={dashboard.reconciliation}
    />
  );
}
