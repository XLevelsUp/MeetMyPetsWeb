import { copy } from "@/config/admin";

/**
 * Date formatting shared by the users and pets tables, so a column reading
 * "16 Aug 2026" on one tab cannot read "8/16/2026" on the other.
 *
 * Locale is pinned to en-IN deliberately: this is an operations tool for one
 * team, and a date that changes shape with the reviewer's machine makes
 * screenshots and audit notes ambiguous.
 */
export function formatDate(value: string | null): string {
  if (!value) return copy.dashboard.noData;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
