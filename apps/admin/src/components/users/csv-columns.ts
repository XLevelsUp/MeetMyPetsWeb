import type { CsvColumn } from "@/lib/csv";
import type { ReportSummary } from "@/lib/reports-contract";
import type { TrustQueueEntry } from "@/lib/trust-contract";
import type { CertificateSummary } from "@/lib/verifications-contract";
import type { AccountSummary, PetSummary } from "@/lib/users-contract";

/**
 * What an export contains, kept beside the tables that offer it.
 *
 * Ids are included so a row can be traced back to the panel; the counts are
 * blank unless that metric was the active sort, which is the same honesty the
 * table shows rather than writing a zero nobody computed.
 */
export const PET_CSV_COLUMNS: readonly CsvColumn<PetSummary>[] = [
  { header: "Pet ID", value: (p) => p.id },
  { header: "Name", value: (p) => p.name },
  { header: "Species", value: (p) => p.species },
  { header: "Breed", value: (p) => p.breed },
  { header: "Status", value: (p) => p.status },
  { header: "Trust score", value: (p) => p.trustScore },
  { header: "Followers", value: (p) => p.followers },
  { header: "Likes", value: (p) => p.likes },
  { header: "Matches", value: (p) => p.matches },
  { header: "Restriction", value: (p) => p.restriction?.kind ?? "" },
  { header: "Owner account ID", value: (p) => p.ownerAccountId },
  { header: "Added", value: (p) => p.createdAt },
];

export const ACCOUNT_CSV_COLUMNS: readonly CsvColumn<AccountSummary>[] = [
  { header: "Account ID", value: (a) => a.id },
  { header: "Name", value: (a) => a.displayName },
  { header: "Email", value: (a) => a.email },
  { header: "Phone", value: (a) => a.phone },
  { header: "Status", value: (a) => a.status },
  { header: "Pets", value: (a) => a.petCount },
  { header: "Restriction", value: (a) => a.restriction?.kind ?? "" },
  { header: "Last login", value: (a) => a.lastLoginAt },
  { header: "Joined", value: (a) => a.createdAt },
];

export const CERTIFICATE_CSV_COLUMNS: readonly CsvColumn<CertificateSummary>[] = [
  { header: "Certificate ID", value: (r) => r.id },
  { header: "Pet ID", value: (r) => r.petId },
  { header: "Pet Name", value: (r) => r.petName ?? "" },
  { header: "Owner Account ID", value: (r) => r.ownerAccountId ?? "" },
  { header: "Owner Email", value: (r) => r.ownerEmail ?? "" },
  { header: "Type", value: (r) => r.certificateType },
  { header: "Status", value: (r) => r.status },
  { header: "Certificate No.", value: (r) => r.claims.certificateNumber ?? "" },
  { header: "Issued By", value: (r) => r.claims.issuedBy ?? "" },
  { header: "Issued At", value: (r) => r.claims.issuedAt ?? "" },
  { header: "Expires At", value: (r) => r.claims.expiresAt ?? "" },
  { header: "Veterinarian", value: (r) => r.claims.veterinarian ?? "" },
  { header: "Clinic", value: (r) => r.claims.clinicName ?? "" },
  { header: "Has Document", value: (r) => (r.hasDocument ? "yes" : "no") },
  { header: "Submitted", value: (r) => r.createdAt ?? "" },
  { header: "Reviewed At", value: (r) => r.reviewedAt ?? "" },
  { header: "Remarks", value: (r) => r.remarks ?? "" },
];

export const REPORT_CSV_COLUMNS: readonly CsvColumn<ReportSummary>[] = [
  { header: "Report ID", value: (r) => r.id },
  { header: "Reported Pet ID", value: (r) => r.reportedPetId },
  { header: "Reported Pet Name", value: (r) => r.reportedPetName ?? "" },
  { header: "Owner Account ID", value: (r) => r.reportedOwnerAccountId ?? "" },
  { header: "Owner Email", value: (r) => r.reportedOwnerEmail ?? "" },
  { header: "Reporter Pet ID", value: (r) => r.reporterPetId },
  { header: "Reporter Pet Name", value: (r) => r.reporterPetName ?? "" },
  { header: "Reason", value: (r) => r.reason },
  { header: "Scope", value: (r) => r.scope },
  { header: "Status", value: (r) => r.status },
  { header: "Trust Score", value: (r) => r.trust.score ?? "" },
  { header: "Trust Status", value: (r) => r.trust.status ?? "" },
  { header: "Reports Against Pet", value: (r) => r.reportsAgainstPet },
  { header: "Details", value: (r) => r.details ?? "" },
  { header: "Post ID", value: (r) => r.post?.id ?? "" },
  { header: "Post Caption", value: (r) => r.post?.caption ?? "" },
  { header: "Media URL", value: (r) => r.media?.url ?? "" },
  { header: "Submitted", value: (r) => r.createdAt },
];

export const TRUST_CSV_COLUMNS: readonly CsvColumn<TrustQueueEntry>[] = [
  { header: "Pet ID", value: (e) => e.petId },
  { header: "Pet Name", value: (e) => e.petName ?? "" },
  { header: "Owner Account ID", value: (e) => e.ownerAccountId ?? "" },
  { header: "Owner Email", value: (e) => e.ownerEmail ?? "" },
  { header: "Trust Score", value: (e) => e.score },
  { header: "Trust Status", value: (e) => e.status },
  { header: "Review Due", value: (e) => e.reviewDueAt ?? "" },
  { header: "Review Overdue", value: (e) => (e.reviewOverdue ? "yes" : "no") },
  { header: "Ban Started", value: (e) => e.banStartedAt ?? "" },
  { header: "Reports Count", value: (e) => e.reportCount },
  { header: "Warning Acknowledged", value: (e) => (e.warningAcknowledged ? "yes" : "no") },
];
