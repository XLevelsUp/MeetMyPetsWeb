// Age bands for the dashboard. Counts only — no birth date ever leaves the server.

export const PET_AGE_BUCKETS = ["under1", "1to2", "3to6", "7to10", "11plus", "unknown"] as const;
export type PetAgeBucket = (typeof PET_AGE_BUCKETS)[number];

export const PERSON_AGE_BUCKETS = ["under18", "18to24", "25to34", "35to44", "45to54", "55plus", "unknown"] as const;
export type PersonAgeBucket = (typeof PERSON_AGE_BUCKETS)[number];

export type AgeCount<K extends string> = { key: K; count: number };

// Whole years, birthday-aware: born 25 Nov is still 24 on 24 Nov. Null for missing, unparseable or future dates.
export function ageInYears(dob: string | null | undefined, now: Date = new Date()): number | null {
  if (!dob) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age < 0 || age > 120 ? null : age;
}

export function petAgeBucket(age: number | null): PetAgeBucket {
  if (age === null) return "unknown";
  if (age < 1) return "under1";
  if (age <= 2) return "1to2";
  if (age <= 6) return "3to6";
  if (age <= 10) return "7to10";
  return "11plus";
}

export function personAgeBucket(age: number | null): PersonAgeBucket {
  if (age === null) return "unknown";
  if (age < 18) return "under18";
  if (age <= 24) return "18to24";
  if (age <= 34) return "25to34";
  if (age <= 44) return "35to44";
  if (age <= 54) return "45to54";
  return "55plus";
}

// Every bucket is returned, in order, even at zero — an age chart with missing bands misreads as a gap in the data.
export function countByBucket<K extends string>(
  buckets: readonly K[],
  dobs: (string | null)[],
  toBucket: (age: number | null) => K,
  now: Date = new Date(),
): AgeCount<K>[] {
  const counts = new Map<K, number>(buckets.map((b) => [b, 0]));
  for (const dob of dobs) {
    const key = toBucket(ageInYears(dob, now));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

// People = every non-deleted account; one with no profile or no birth date counts as "unknown".
export function personDobs(
  accounts: { id: string; deleted_at: string | null }[],
  profiles: { account_id: string; date_of_birth: string | null }[],
): (string | null)[] {
  const byAccount = new Map(profiles.map((p) => [p.account_id, p.date_of_birth]));
  return accounts.filter((a) => !a.deleted_at).map((a) => byAccount.get(a.id) ?? null);
}
