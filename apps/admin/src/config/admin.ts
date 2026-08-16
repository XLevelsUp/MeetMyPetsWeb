/**
 * Single source of truth for every user-facing string and the navigation
 * model of the admin panel — the same pattern as apps/landing/src/config/
 * site.ts. Copy is never hardcoded in components.
 */

import {
  ADMIN_ROLES,
  ANALYTICS_ROLES,
  AUDIT_ROLES,
  REPORTS_ROLES,
  SETTINGS_ROLES,
  TRUST_ROLES,
  USERS_VIEW_ROLES,
  VERIFICATION_ROLES,
  type AdminRole,
} from "@/lib/roles";

export const admin = {
  name: "MeetMyPets Admin",
  shortName: "MMP Admin",
  description: "Operational command center for MeetMyPets moderators and founders.",
} as const;

/**
 * Sidebar navigation.
 *
 * `icon` values are lucide icon names resolved in app-sidebar.tsx — kept as
 * strings here so this file stays a pure data module.
 *
 * TWO INDEPENDENT GATES, and they mean different things:
 *
 * - `enabled: false` — "coming in a later phase". Rendered greyed out with a
 *   tooltip, so the information architecture is visible from day one.
 * - `roles` — who may open it. Entries outside the viewer's role are **hidden
 *   entirely**, because "not yours" and "not yet" are different messages and
 *   greying out the former just advertises a door that will never open.
 *
 * `roles` references the allowlists rather than literal role strings, so nav
 * visibility and the route's own `requireRole(...)` are the same decision and
 * cannot drift. Changing who may reach a feature is a one-line edit in
 * roles.ts that moves both.
 *
 * ⚠️ Hiding is UX. `requireRole` in lib/dal.ts is the boundary — every route
 * keeps its own check, and typing the URL still redirects.
 */
export const adminNav = [
  { label: "Dashboard", href: "/", icon: "layout-dashboard", enabled: true, roles: ANALYTICS_ROLES },
  { label: "Users & Pets", href: "/users", icon: "users", enabled: true, roles: USERS_VIEW_ROLES },
  {
    label: "Verifications",
    href: "/verifications",
    icon: "badge-check",
    enabled: true,
    roles: VERIFICATION_ROLES,
  },
  { label: "Content Reports", href: "/reports", icon: "flag", enabled: true, roles: REPORTS_ROLES },
  { label: "Trust Review", href: "/trust", icon: "shield-alert", enabled: true, roles: TRUST_ROLES },
  {
    label: "Business Directory",
    href: "/businesses",
    icon: "store",
    enabled: false,
    // Placeholder: the feature has no route or allowlist yet, and the entry is
    // inert. Give it a real allowlist when Phase 4 lands.
    roles: ADMIN_ROLES,
  },
  { label: "Audit Logs", href: "/audit", icon: "scroll-text", enabled: true, roles: AUDIT_ROLES },
  { label: "Settings", href: "/settings", icon: "settings", enabled: true, roles: SETTINGS_ROLES },
] as const;

export type AdminNavItem = (typeof adminNav)[number];

/**
 * The nav a role may see. Filters a copy — `breadcrumbs.tsx` reads the full
 * `adminNav` to resolve labels, and narrowing the shared array would blank the
 * breadcrumb on pages the viewer legitimately has open.
 */
export function navForRole(role: AdminRole): readonly AdminNavItem[] {
  return adminNav.filter((item) => (item.roles as readonly AdminRole[]).includes(role));
}

export const copy = {
  comingSoon: "Coming in a later phase",
  /** Strings shared by every list surface. Feature-specific copy stays below. */
  common: {
    retry: "Retry",
    pagination: { previous: "Previous", next: "Next", showing: "Showing" },
  },
  searchPlaceholder: "Search users, pets, reports…",
  /** System status is a config-driven stub in Phase 1 — no live probe yet. */
  systemStatus: { state: "operational", label: "All systems operational" },
  login: {
    title: "Sign in to MeetMyPets Admin",
    subtitle: "Moderator and founder access only.",
    emailLabel: "Email",
    passwordLabel: "Password",
    submit: "Sign in",
    errors: {
      "session-expired": "Your session has expired. Please sign in again.",
      "not-admin": "This account has no admin access.",
      "invalid-credentials": "Incorrect email or password.",
      unknown: "Something went wrong signing you in. Please try again.",
    },
  },
  dashboard: {
    title: "Dashboard",
    metrics: {
      totalUsers: "Total Users",
      activePets: "Active Pets",
      totalMatches: "Total Matches",
      activeChats: "Active Chats",
      pendingVerifications: "Pending Verifications",
      openReports: "Open Reports",
    },
    charts: {
      acquisitionTitle: "User acquisition",
      acquisitionDescription: "New sign-ups per day, last 30 days",
      swipeTitle: "Swipe volume",
      swipeDescription: "Daily swipes, last 30 days",
      speciesTitle: "Active pets by species",
    },
    deltaVsLastWeek: "vs last week",
    noData: "—",
  },
  users: {
    title: "Users & Pets",
    subtitle: "Search accounts and pet profiles, and act on abuse.",
    tabs: { users: "Users", pets: "Pets" },
    searchPlaceholder: "Search email, name, phone, or paste an ID…",
    statusLabel: "Status",
    statusOptions: {
      all: "All",
      active: "Active",
      archived: "Archived",
      suspended: "Suspended",
      banned: "Banned",
      flagged: "Flagged",
    },
    columns: {
      user: "User",
      contact: "Contact",
      pets: "Pets",
      status: "Status",
      joined: "Joined",
      lastActive: "Last active",
      pet: "Pet",
      species: "Species",
      owner: "Owner",
      added: "Added",
      actions: "Actions",
    },
    empty: "No matches. Try a different search or filter.",
    detail: {
      back: "Back to Users & Pets",
      notFound: "That account no longer exists.",
      profile: "Profile",
      pets: "Pets",
      verifications: "Verifications",
      history: "Moderation history",
      noPets: "No pets on this account.",
      noVerifications: "No verification records.",
      noHistory: "No moderation actions have been taken on this account.",
      neverActive: "Never",
      verified: "Verified",
      unverified: "Unverified",
      lifted: "Lifted",
    },
    /**
     * Destructive-action copy. `confirm` is the button label; `description`
     * must state the real-world consequence, because the reason typed here
     * becomes the permanent audit record.
     */
    actions: {
      suspend: {
        label: "Suspend",
        title: "Suspend this account?",
        description:
          "They will be signed out of the mobile app and cannot sign back in until the suspension expires.",
        confirm: "Suspend account",
      },
      ban: {
        label: "Ban",
        title: "Ban this account?",
        description:
          "This blocks sign-in indefinitely. Only a super admin can reverse it.",
        confirm: "Ban account",
      },
      restore: {
        label: "Restore",
        title: "Restore this account?",
        description: "Sign-in is re-enabled immediately and active restrictions are lifted.",
        confirm: "Restore account",
      },
      flag: {
        label: "Flag",
        title: "Flag this pet profile?",
        description: "Marks the profile for review. It stays visible in the app.",
        confirm: "Flag pet",
      },
      unflag: {
        label: "Unflag",
        title: "Remove this flag?",
        description: "Clears the review flag on this pet profile.",
        confirm: "Remove flag",
      },
    },
    dialog: {
      reasonLabel: "Reason (recorded in the audit log)",
      reasonPlaceholder: "What prompted this? Include ticket or report references.",
      durationLabel: "Suspend for",
      durations: {
        "24": "24 hours",
        "72": "3 days",
        "168": "7 days",
        "720": "30 days",
      },
      cancel: "Cancel",
      submitting: "Working…",
    },
    toast: {
      suspend: "Account suspended.",
      ban: "Account banned.",
      restore: "Account restored.",
      flag: "Pet flagged.",
      unflag: "Flag removed.",
    },
    /** Shown when the lockout took effect but the audit write failed. */
    unauditedWarning:
      "The action was applied, but writing the audit log failed. Tell an engineer before doing anything else.",
    viewHistory: "View in audit log",
  },
  audit: {
    title: "Audit Logs",
    subtitle: "Every moderation action, who took it, and why.",
    searchPlaceholder: "Search by admin email, reason, or paste an ID…",
    filters: {
      action: "Action",
      target: "Target",
      from: "From",
      to: "To",
      all: "All",
      clear: "Clear filters",
    },
    columns: {
      when: "When",
      actor: "Admin",
      action: "Action",
      target: "Target",
      reason: "Reason",
    },
    targetTypes: {
      account: "Account",
      pet: "Pet",
      report: "Report",
      certificate: "Certificate",
      species: "Species",
      breed: "Breed",
    },
    /**
     * An empty audit log is the normal state on a fresh install, not an
     * error — the copy should reassure rather than alarm.
     */
    empty: "No admin actions recorded yet.",
    emptyFiltered: "No actions match these filters.",
    viewAccount: "Open account",
    details: "Details",
    detailDialog: {
      title: "Audit entry",
      description: "The full record as written. Audit rows can never be edited or deleted.",
      metadata: "Metadata",
      noMetadata: "No additional metadata.",
      close: "Close",
    },
    /** Mirrors AUDIT_ACTIONS in lib/audit-actions.ts. */
    actionLabels: {
      "account.suspend": "Account suspended",
      "account.ban": "Account banned",
      "account.restore": "Account restored",
      "pet.flag": "Pet flagged",
      "pet.unflag": "Pet flag removed",
      "report.review": "Report reviewed",
      "report.action": "Report actioned",
      "report.dismiss": "Report dismissed",
      "certificate.approve": "Certificate approved",
      "certificate.reject": "Certificate rejected",
      "species.create": "Species added",
      "species.update": "Species updated",
      "breed.create": "Breed added",
      "breed.update": "Breed updated",
      "trust.restore": "Trust restored",
      "trust.ban": "Pet permanently banned",
    },
  },
  reports: {
    title: "Content Reports",
    description: "Reports filed from the app against pet profiles and posts.",
    searchPlaceholder: "Search report text, or paste a report / pet ID…",
    filters: {
      status: "Status",
      reason: "Reason",
      scope: "About",
      all: "All",
      clear: "Clear filters",
    },
    columns: {
      when: "Filed",
      reported: "Reported pet",
      reason: "Reason",
      scope: "About",
      trust: "Trust",
      status: "Status",
    },
    /**
     * An empty queue is the goal state, not an error — but an empty *filtered*
     * view usually means the filter, so the two read differently.
     */
    empty: "No reports in the queue. Nothing needs attention.",
    emptyFiltered: "No reports match these filters.",
    statusLabels: {
      pending: "Pending",
      reviewed: "Reviewed",
      actioned: "Actioned",
      dismissed: "Dismissed",
    },
    reasonLabels: {
      spam: "Spam",
      harassment: "Harassment",
      inappropriate_content: "Inappropriate content",
      fake_profile: "Fake profile",
      animal_welfare: "Animal welfare",
      scam: "Scam",
      other: "Other",
    },
    scopeLabels: { profile: "Pet profile", post: "A post" },
    trustLabels: {
      permanently_banned: "Permanently banned",
      temporary_banned: "Temporarily banned",
      warning: "Warning",
      normal: "Normal",
    },
    /** Trust is the backend's automated signal; the panel only displays it. */
    trustHint: "Automated trust score, owned by the app backend. The panel never changes it.",
    noTrustScore: "Unknown",
    details: "Review",
    detailDialog: {
      title: "Report",
      description: "Filed from the app. The panel can change its status and nothing else.",
      reporterNote: "Reporter's note",
      noReporterNote: "The reporter left no note.",
      reportedPet: "Reported pet",
      reporterPet: "Filed by",
      owner: "Owner",
      post: "Reported post",
      postDeleted: "This post has since been deleted.",
      noCaption: "This post has no caption.",
      history: "Reports against this pet",
      openAccount: "Open owner's account",
      close: "Close",
    },
    resolve: {
      reviewed: "Mark reviewed",
      actioned: "Mark actioned",
      dismissed: "Dismiss",
      reasonLabel: "Reason (recorded in the audit log)",
      reasonPlaceholder: "What did you find, and what did you do about it?",
      confirmTitle: "Resolve this report?",
      confirmDescription:
        "This changes the report's status and writes an audit row. It does not by itself flag the pet or restrict the owner — do that from the pet or account if it's warranted.",
      cancel: "Cancel",
      submit: "Confirm",
      submitting: "Saving…",
      error: "Could not resolve the report.",
    },
  },
  verifications: {
    title: "Verifications",
    description: "Pet certificates awaiting review — vaccination, health and licence documents.",
    searchPlaceholder: "Search certificate number, vet, clinic, or paste an ID…",
    filters: {
      status: "Status",
      type: "Type",
      all: "All",
      clear: "Clear filters",
    },
    columns: {
      submitted: "Submitted",
      pet: "Pet",
      type: "Type",
      document: "Document",
      status: "Status",
    },
    /** An empty queue is the goal state here, not an error. */
    empty: "Nothing awaiting review. The queue is clear.",
    emptyFiltered: "No certificates match these filters.",
    statusLabels: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
    },
    typeLabels: {
      vaccination: "Vaccination",
      health: "Health",
      license: "Licence",
    },
    rejectionLabels: {
      illegible: "Illegible or unreadable",
      expired: "Expired document",
      wrong_pet: "Does not match this pet",
      wrong_document_type: "Wrong document type",
      incomplete: "Incomplete or partial",
      suspected_forgery: "Suspected forgery",
      other: "Other",
    },
    /** The review pane. */
    review: {
      heading: "Review",
      selectPrompt: "Select a certificate from the queue to review it.",
      claimsHeading: "What the owner entered",
      /**
       * Says plainly what this comparison is. There is no OCR in this system —
       * calling it an "extraction" would imply a machine had already read the
       * document and agreed.
       */
      claimsHint:
        "Typed by the owner at upload — not extracted from the document. Check each field against the scan.",
      notProvided: "Not provided",
      levelHeading: "Current verification level",
      levelHint: "Maintained by the app backend. The panel never changes it.",
      noLevel: "This pet has no verification record yet.",
      documentHeading: "Uploaded document",
      noDocument: "No document was attached to this record.",
      documentError: "Could not load the document.",
      documentExpired: "This preview link expired.",
      reload: "Reload document",
      loading: "Loading document…",
      openInNewTab: "Open in new tab",
      pdfFallback: "This PDF cannot be displayed inline.",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      resetView: "Reset view",
      shortcutHint: "Press A to approve, R to reject.",
    },
    decide: {
      approve: "Approve",
      reject: "Reject",
      approveTitle: "Approve this certificate?",
      /**
       * The +500 is stated in words. A moderator should never learn the
       * consequence of their click by reading the schema.
       */
      approveDescription:
        "This marks the certificate approved and awards the pet +500 trust through the app backend's scoring engine. The panel cannot undo either — reversing it needs the backend team.",
      rejectTitle: "Reject this certificate?",
      rejectDescription:
        "This marks the certificate rejected and records your reason. It does not change the pet's trust score.",
      reasonLabel: "Reason (recorded in the audit log)",
      reasonPlaceholder: "What did you check, and what did you conclude?",
      rejectionReasonLabel: "Rejection reason",
      cancel: "Cancel",
      confirmApprove: "Approve and award trust",
      confirmReject: "Reject certificate",
      submitting: "Saving…",
      error: "Could not save the decision.",
      conflict: "Someone else decided this certificate first.",
    },
  },
  trust: {
    title: "Trust Review",
    description:
      "Pets restricted by the app's automated trust system. These bans are applied without a moderator — and are only ever lifted by one.",
    /**
     * The fact that makes this screen necessary rather than merely useful.
     * `temporary_ban_until` is informational in the database; nothing consults
     * it, so "temporary" means permanent until someone acts here.
     */
    clockWarning:
      "A temporary ban never expires on its own. The owner was told a review date — only restoring the pet here ends it.",
    searchPlaceholder: "Search pet name, or paste a pet / owner ID…",
    filters: { status: "Status", all: "All", overdue: "Overdue reviews only", clear: "Clear filters" },
    columns: {
      pet: "Pet",
      status: "Trust",
      score: "Score",
      reviewDue: "Review due",
      reports: "Reports",
    },
    statusLabels: {
      permanently_banned: "Permanently banned",
      temporary_banned: "Temporarily banned",
      warning: "Warning",
      normal: "Normal",
    },
    /** Mirrors pets.trust_score_delta — display only, never computed here. */
    eventLabels: {
      like: "Received a like",
      follow: "Gained a follower",
      match: "Matched",
      block: "Blocked by another pet",
      report: "Profile reported",
      post_report: "Post reported",
      certificate_verified: "Certificate approved",
    },
    empty: "No pets are restricted. The automated system has banned nobody.",
    emptyFiltered: "No pets match these filters.",
    overdueBadge: "Overdue",
    noReviewDate: "—",
    acknowledgedNote:
      "The owner has already dismissed the warning dialog, so the app now reports this pet as normal. The true state is shown here.",
    review: "Review",
    ledger: {
      heading: "Trust history",
      description: "Every automatic change to this pet's score, newest first.",
      empty: "No recorded events. This pet's score has never moved automatically.",
      /** Admin restores are not in their ledger — say so rather than let it look complete. */
      restoreNote:
        "Admin restores are not recorded here — the app backend's ledger only tracks automatic events. Restores appear in the audit log.",
      columns: { when: "When", event: "Event", delta: "Change", actor: "Triggered by" },
      close: "Close",
    },
    restore: {
      action: "Restore trust",
      title: "Restore this pet?",
      /**
       * States every consequence, including the two that are invisible in the
       * column we write and happen via the backend's trigger.
       */
      description:
        "This sets the pet's trust score back to 555, which immediately ends the ban, clears its review date, and re-arms the one-time warning dialog for the owner. It does not resolve any open reports against the pet — do that in Content Reports if it's warranted.",
      reasonLabel: "Reason (recorded in the audit log)",
      reasonPlaceholder: "What did you review, and why is the restriction being lifted?",
      cancel: "Cancel",
      confirm: "Restore",
      submitting: "Restoring…",
      error: "Could not restore the pet.",
      alreadyNormal: "This pet is already in good standing.",
    },
    ban: {
      action: "Ban permanently",
      title: "Permanently ban this pet?",
      /**
       * Every consequence in words, including the two that happen elsewhere:
       * the app-side lockout is their trigger's doing, and the discovery
       * removal depends on a restriction row the app has to read.
       */
      description:
        "The owner is locked out of this pet immediately and sees the permanent-ban screen next time the app checks. The pet is also marked restricted so it can be removed from discovery. Their other pets are unaffected, and this is reversible — Restore puts the pet back in good standing.",
      reasonLabel: "Reason (recorded in the audit log)",
      reasonPlaceholder: "What did you review, and why does this warrant a permanent ban?",
      confirm: "Ban permanently",
      submitting: "Banning…",
      error: "Could not ban the pet.",
      alreadyBanned: "This pet is already permanently banned.",
    },
    /**
     * A permanent ban still stamps a review date, because the backend trigger
     * sets a 7-day window for any score under 100 without distinguishing
     * permanent from temporary. Showing it would claim a review is pending on a
     * pet nobody intends to review.
     */
    permanentNoReview: "No review — permanently banned.",
    toast: { restored: "Trust restored.", banned: "Pet permanently banned." },
  },
  settings: {
    title: "Settings",
    description: "Platform taxonomy and configuration. Super-admin only.",
    /**
     * The warning that matters: these tables are read live by the mobile app,
     * so there is no staging step between an edit here and pet creation there.
     */
    liveWarning:
      "The mobile app reads this taxonomy live. Changes appear in pet creation immediately.",
    tabs: { species: "Species", breeds: "Breeds", schemas: "Attribute schemas" },
    statusLabels: { active: "Active", inactive: "Retired" },
    filters: { status: "Status", species: "Species", all: "All", clear: "Clear filters" },
    species: {
      searchPlaceholder: "Search species…",
      columns: { name: "Species", breeds: "Breeds", pets: "Active pets", status: "Status" },
      empty: "No species configured yet.",
      emptyFiltered: "No species match these filters.",
      add: "Add species",
      addTitle: "Add a species",
      addDescription:
        "It becomes selectable in the mobile app's pet creation flow as soon as you save.",
      editTitle: "Edit species",
      editDescription: "Renaming changes what every user sees for pets already using it.",
    },
    breeds: {
      searchPlaceholder: "Search breeds…",
      columns: { name: "Breed", species: "Species", pets: "Active pets", status: "Status" },
      empty: "No breeds configured yet.",
      emptyFiltered: "No breeds match these filters.",
      add: "Add breed",
      addTitle: "Add a breed",
      addDescription: "Breeds are listed under one species and cannot be moved between them.",
      editTitle: "Edit breed",
      editDescription: "Renaming changes what every user sees for pets already using it.",
    },
    form: {
      nameLabel: "Name",
      namePlaceholder: "e.g. Rabbit",
      descriptionLabel: "Description (optional)",
      speciesLabel: "Species",
      statusLabel: "Status",
      reasonLabel: "Reason (recorded in the audit log)",
      reasonPlaceholder: "Why are you making this change?",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      error: "Could not save.",
    },
    retire: {
      title: "Retire this entry?",
      description:
        "It stops being offered for new pets. Existing pets keep it. You can reactivate it later — nothing is deleted.",
      /** Explains a refusal the database itself cannot express. */
      blocked: "Active pets still use this. Move them to another entry first.",
    },
    /**
     * Deletion is impossible, not merely disallowed — say why, so nobody goes
     * looking for the button.
     */
    noDeleteNote:
      "Entries can be retired but never deleted: pets reference them by a required foreign key, so the database itself refuses.",
    schemas: {
      heading: "Per-species attribute schemas",
      body: "Not available yet — and it needs a mobile-app change, not a panel one. Pet attributes are fixed columns on the pets table today, and species-specific rules (blood groups, for example) are compiled into the Flutter app. A schema defined here would not reach pet creation until the app reads it. The proposal is written up for the app team.",
      docLink: "See docs/admin/attribute-schema-proposal.md",
    },
    toast: {
      speciesCreated: "Species added.",
      speciesUpdated: "Species updated.",
      breedCreated: "Breed added.",
      breedUpdated: "Breed updated.",
    },
  },
} as const;
