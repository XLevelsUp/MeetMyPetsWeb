import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AdminRole } from "@/lib/roles";
import { Breadcrumbs } from "./breadcrumbs";
import { RoleBadge } from "./role-badge";
import { SearchStub } from "./search-stub";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/**
 * Top chrome: sidebar trigger, breadcrumbs, global search (stub), role
 * badge, theme toggle, profile menu. Session props come from the gated
 * (dashboard) layout — already DAL-verified.
 */
export function AppHeader({ email, role }: { email: string; role: AdminRole }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-5" />
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <SearchStub />
        <RoleBadge role={role} />
        <ThemeToggle />
        <UserMenu email={email} role={role} />
      </div>
    </header>
  );
}
