import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type AdminRole } from "@/lib/roles";

const variants: Record<AdminRole, React.ComponentProps<typeof Badge>["variant"]> = {
  super_admin: "default",
  moderator: "secondary",
  support: "outline",
};

export function RoleBadge({ role }: { role: AdminRole }) {
  return <Badge variant={variants[role]}>{ROLE_LABELS[role]}</Badge>;
}
