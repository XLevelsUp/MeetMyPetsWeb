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
  { label: "Users & Pets", href: "/users", icon: "users", enabled: false },
  { label: "Verifications", href: "/verifications", icon: "badge-check", enabled: false },
  { label: "Content Reports", href: "/reports", icon: "flag", enabled: false },
  { label: "Business Directory", href: "/businesses", icon: "store", enabled: false },
  { label: "Audit Logs", href: "/audit", icon: "scroll-text", enabled: false },
  { label: "Settings", href: "/settings", icon: "settings", enabled: false },
] as const;

export type AdminNavItem = (typeof adminNav)[number];

export const copy = {
  comingSoon: "Coming in a later phase",
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
} as const;
