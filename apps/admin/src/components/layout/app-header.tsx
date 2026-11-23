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
    // Phones keep only menu, page name, theme and profile; the divider and role badge return from sm (the role is also in the profile menu).
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:gap-3 sm:px-4">
      <SidebarTrigger aria-label="Open menu" />
      <Separator orientation="vertical" className="hidden h-5 sm:block" />
      <Breadcrumbs />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <SearchStub />
        <span className="hidden sm:contents">
          <RoleBadge role={role} />
        </span>
        <ThemeToggle />
        <UserMenu email={email} role={role} />
      </div>
    </header>
  );
}
