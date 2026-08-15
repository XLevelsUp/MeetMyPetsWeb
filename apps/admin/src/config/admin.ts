/**
 * Single source of truth for every user-facing string and the navigation
 * model of the admin panel — the same pattern as apps/landing/src/config/
 * site.ts. Copy is never hardcoded in components.
 */

export const admin = {
  name: "MeetMyPets Admin",
  shortName: "MMP Admin",
  description: "Operational command center for MeetMyPets moderators and founders.",
} as const;

/**
 * Sidebar navigation. Phase 1 ships only the Dashboard; the remaining
 * entries are rendered disabled (aria-disabled + tooltip) so the information
 * architecture is visible from day one and later phases only flip `enabled`.
 *
 * `icon` values are lucide icon names resolved in app-sidebar.tsx — kept as
 * strings here so this file stays a pure data module.
 */
export const adminNav = [
  { label: "Dashboard", href: "/", icon: "layout-dashboard", enabled: true },
  { label: "Users & Pets", href: "/users", icon: "users", enabled: true },
  { label: "Verifications", href: "/verifications", icon: "badge-check", enabled: false },
  { label: "Content Reports", href: "/reports", icon: "flag", enabled: true },
  { label: "Business Directory", href: "/businesses", icon: "store", enabled: false },
  { label: "Audit Logs", href: "/audit", icon: "scroll-text", enabled: true },
  { label: "Settings", href: "/settings", icon: "settings", enabled: false },
] as const;

export type AdminNavItem = (typeof adminNav)[number];

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
    targetTypes: { account: "Account", pet: "Pet", report: "Report" },
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
} as const;
