// Date-range filter + page maths for the Team messages history. No server-only imports: the page uses it too.

export const HISTORY_PAGE_SIZE = 25;
export const HISTORY_SCAN_LIMIT = 2000;

type Dated = { state: string; sendAt: string | null; sentAt: string | null; deletedAt: string | null; createdAt: string };

// The same date the "When" column shows, so filtering by month matches what staff see.
export function whenIso(message: Dated): string | null {
  switch (message.state) {
    case "scheduled":
    case "failed":
      return message.sendAt;
    case "deleted":
      return message.deletedAt;
    case "sent":
      return message.sentAt ?? message.createdAt;
    default:
      return message.createdAt;
  }
}

// "YYYY-MM-DD" in the viewer's zone; tzOffset is minutes east of UTC (India = 330).
export function dayKey(iso: string | null, tzOffset: number): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms + tzOffset * 60_000).toISOString().slice(0, 10);
}

// From and To are both whole days, inclusive; either may be left open. Swapped if entered backwards.
export function filterByDateRange<T extends Dated>(items: T[], from: string | undefined, to: string | undefined, tzOffset: number): T[] {
  if (!from && !to) return items;
  const [lo, hi] = from && to && from > to ? [to, from] : [from, to];
  return items.filter((m) => {
    const day = dayKey(whenIso(m), tzOffset);
    return day !== null && (!lo || day >= lo) && (!hi || day <= hi);
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// First and last day of the month `offset` months from now (0 = this month, -1 = last, 1 = next), in local time.
export function monthRange(offset: number, now: Date = new Date()): { from: string; to: string } {
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: localDay(first), to: localDay(last) };
}

const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return DAY_LABEL.format(new Date(y, m - 1, d));
}

// Clamps to the last real page so an old link never shows an empty page.
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const lastPage = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), lastPage);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pageSize, total: items.length };
}

// "Sent by" value for automatic rows that have no staff sender.
export const SYSTEM_SENDER = "system";

type Filterable = Dated & { createdByEmail: string | null; createdByRole: string | null; audience: string | null; body: string };

export type HistoryFilters = { from?: string; to?: string; tz: number; sender?: string; audience?: string; q?: string };

export function senderKey(message: Pick<Filterable, "createdByEmail">): string {
  return message.createdByEmail?.toLowerCase() ?? SYSTEM_SENDER;
}

// Dates, sender, audience and text all narrow together; text match ignores case.
export function filterHistory<T extends Filterable>(items: T[], f: HistoryFilters): T[] {
  const needle = f.q?.trim().toLowerCase();
  return filterByDateRange(items, f.from, f.to, f.tz).filter(
    (m) =>
      (!f.sender || senderKey(m) === f.sender.toLowerCase()) &&
      (!f.audience || m.audience === f.audience) &&
      (!needle || m.body.toLowerCase().includes(needle)),
  );
}

export type SenderOption = { value: string; email: string | null; role: string | null; count: number };

// Everyone who sent on this tab, busiest first, so the "Sent by" list only offers names that have results.
export function senderOptions<T extends Filterable>(items: T[]): SenderOption[] {
  const byKey = new Map<string, SenderOption>();
  for (const m of items) {
    const value = senderKey(m);
    const existing = byKey.get(value);
    if (existing) existing.count += 1;
    else byKey.set(value, { value, email: m.createdByEmail, role: m.createdByRole, count: 1 });
  }
  // Staff first (busiest, then A–Z); "System" always last since it isn't a person.
  return [...byKey.values()].sort(
    (a, b) =>
      Number(a.value === SYSTEM_SENDER) - Number(b.value === SYSTEM_SENDER) ||
      b.count - a.count ||
      (a.email ?? "").localeCompare(b.email ?? ""),
  );
}
