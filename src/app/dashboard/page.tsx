import { DashboardShell } from "@/components/dashboard-shell";
import { syncCurrentUser } from "@/server/users";

export default async function DashboardPage() {
  const user = await syncCurrentUser();

  return <DashboardShell userEmail={user.email} userName={user.fullName} />;
}
