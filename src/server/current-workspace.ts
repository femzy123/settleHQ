import { redirect } from "next/navigation";

import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export async function requireActiveWorkspace() {
  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  return { user, workspace };
}
