import type { ReactNode } from "react";

import {
  Building2,
  FileText,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

export type AppSidebarItem =
  | "Dashboard"
  | "Collections"
  | "Payers"
  | "Invoices"
  | "Payments"
  | "Reports"
  | "Settings";

const navItems: Array<{
  label: AppSidebarItem;
  href: string;
  icon: typeof LayoutDashboard;
}> = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Collections", href: "/collections", icon: ListChecks },
  { label: "Payers", href: "/payers", icon: UsersRound },
  { label: "Invoices", href: "#", icon: FileText },
  { label: "Payments", href: "#", icon: WalletCards },
  { label: "Reports", href: "#", icon: ReceiptText },
  { label: "Settings", href: "/settings", icon: Settings },
];

type AppSidebarProps = {
  activeItem: AppSidebarItem;
  userEmail: string;
  userName?: string | null;
};

export function AppSidebar({
  activeItem,
  userEmail,
  userName,
}: AppSidebarProps) {
  const displayName = userName || "SettleHQ user";

  return (
    <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:w-66 lg:border-b-0 lg:border-r">
      <div className="flex min-h-full flex-col gap-7 px-5 py-6 lg:h-screen">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <Building2 aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">SettleHQ</p>
            <p className="text-sm text-sidebar-foreground/70">
              Finance operations
            </p>
          </div>
        </Link>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === activeItem;

            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={item.href === "#" ? false : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/76 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
                )}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-sidebar-border bg-sidebar-foreground/10 p-3">
          <div className="flex items-center gap-3">
            <UserMenu />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/68">
                {userEmail}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}

type AppShellProps = {
  activeItem: AppSidebarItem;
  userEmail: string;
  userName?: string | null;
  children: ReactNode;
};

export function AppShell({
  activeItem,
  userEmail,
  userName,
  children,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen lg:pl-66">
        <AppSidebar
          activeItem={activeItem}
          userEmail={userEmail}
          userName={userName}
        />
        <section className="px-4 py-5 sm:px-6 lg:px-8">{children}</section>
      </div>
    </main>
  );
}
