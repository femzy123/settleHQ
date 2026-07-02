import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getOrganizationTypeLabel } from "@/lib/organizations";
import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export default async function DashboardPage() {
  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell
      organizationName={workspace.organization.name}
      organizationTypeLabel={getOrganizationTypeLabel(
        workspace.organization.organizationType,
      )}
      userEmail={user.email}
      userName={user.fullName}
    />
  );
}
