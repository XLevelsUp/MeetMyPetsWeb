import { LogOut } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type AdminRole } from "@/lib/roles";

/**
 * Header profile dropdown. Server component — receives the DAL-verified
 * session (never reads auth itself) and wires sign-out through the Server
 * Action.
 *
 * ⚠️ The `DropdownMenuGroup` below is load-bearing, not decoration. This is
 * base-nova on **Base UI**, where `DropdownMenuLabel` is `Menu.GroupLabel` and
 * throws at render if it has no `Menu.Group` ancestor. Radix's equivalent works
 * standalone, so every shadcn snippet online omits it — and omitting it here
 * crashed the entire page on click, from inside a layout where the segment
 * error boundary could not catch it. Guarded by dropdown-menu.test.ts.
 *
 * Grouping the sign-out item too (not just the label) is the point of the
 * primitive: the group gets `role="group"` and the label's id is wired into
 * `aria-labelledby`, so the menu announces as "email, Role".
 */
export function UserMenu({ email, role }: { email: string; role: AdminRole }) {
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-soft text-brand-ink text-sm font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{email}</span>
            <span className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[role]}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={signOut}>
            <DropdownMenuItem
              variant="destructive"
              render={
                <button type="submit" className="w-full">
                  <LogOut />
                  Sign out
                </button>
              }
            />
          </form>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
