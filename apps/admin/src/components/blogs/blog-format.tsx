import { Badge } from "@/components/ui/badge";
import { copy } from "@/config/admin";
import type { BlogStatus } from "@/lib/blog-contract";

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE.format(date);
}

/** Published is the only state the public can see, so it is the only filled badge. */
export function BlogStatusBadge({ status }: { status: BlogStatus }) {
  const variant = status === "published" ? "default" : status === "draft" ? "secondary" : "outline";
  return <Badge variant={variant}>{copy.blogs.statusLabels[status]}</Badge>;
}
