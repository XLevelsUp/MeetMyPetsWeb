/**
 * Single source of truth for every user-facing string and the navigation
 * model of the admin panel — the same pattern as apps/marketing/src/config/
 * site.ts. Copy is never hardcoded in components.
 */

import {
  ADMIN_ROLES,
  ANALYTICS_ROLES,
  AUDIT_ROLES,
  BLOG_ROLES,
  REPORTS_ROLES,
  SETTINGS_ROLES,
  TEAM_MESSAGE_ROLES,
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
  {
    label: "AI Reports",
    href: "/ai-reports",
    icon: "scan-eye",
    enabled: true,
    // Same allowlist as Content Reports: confirming the model is queue
    // hygiene, not a sanction.
    roles: REPORTS_ROLES,
  },
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
  { label: "Blogs", href: "/blogs", icon: "newspaper", enabled: true, roles: BLOG_ROLES },
  { label: "Team Messages", href: "/team-messages", icon: "megaphone", enabled: true, roles: TEAM_MESSAGE_ROLES },
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
    // The app-wide modal (components/providers/dialog-provider.tsx) that replaces window.confirm / window.prompt.
    dialog: {
      confirm: "Confirm",
      cancel: "Cancel",
      ok: "OK",
      unsavedTitle: "Leave without saving?",
      unsavedDescription: "You have changes that aren't saved yet. If you leave this page now, they'll be lost.",
      unsavedLeave: "Leave page",
      unsavedStay: "Stay and keep editing",
    },
    // Horizontal scrolling for wide tables (components/ui/table.tsx).
    table: {
      scrollLeft: "Scroll table left",
      scrollRight: "Scroll table right",
      region: "Table — scroll sideways to see more columns",
      hint: "Swipe, drag the bar, or Shift + scroll to see more columns",
    },
    // Labels for the shared 12-hour date + time picker (components/shared/time-picker.tsx).
    time: {
      date: "Date",
      hour: "Hour",
      minute: "Minute",
      period: "AM or PM",
      am: "AM",
      pm: "PM",
      clear: "Clear",
    },
    loading: "Loading…",
    exportCsv: "Export CSV",
    exporting: "Preparing…",
    /** `{count}` is the number of rows written. */
    exportDone: "Downloaded {count} rows",
    exportEmpty: "Nothing to export with these filters.",
    exportFailed: "Export failed",
    retry: "Retry",
    /** Under a reason box while its buttons are still disabled; `{count}` / `{min}` are characters. */
    reasonHint: "Write a reason to continue — {count}/{min} characters",
    pagination: {
      previous: "Previous",
      next: "Next",
      showing: "Showing",
      of: "of",
      rowsPerPage: "Rows per page",
      page: "Page",
      label: "Pagination",
      /** Read out for a gap: "More pages". */
      morePages: "More pages",
    },
  },
  searchPlaceholder: "Search users, pets, reports…",
  /** System status is a config-driven stub in Phase 1 — no live probe yet. */
  systemStatus: { state: "operational", label: "All systems operational" },
  login: {
    title: "Sign in to MeetMyPets Admin",
    subtitle: "Moderator and founder access only.",
    emailLabel: "Email",
    passwordLabel: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    signingIn: "Signing in…",
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
      /* Short enough to survive a five-column row without truncating. */
      totalUsers: "Users",
      activePets: "Active pets",
      totalMatches: "Matches",
      activeChats: "Active chats",
      pendingVerifications: "Verifications",
      openReports: "Open reports",
      likeRate: "Like rate",
    },
    operations: {
      waiting: "Waiting for review",
      fromAi: "AI",
      fromUsers: "reports",
      oldest: "Oldest:",
      allClear: "Nothing waiting",
      reach: "Can be reached",
      of: "of",
      accounts: "accounts",
      android: "Android",
      iphone: "iPhone",
    },
    charts: {
      /* "User acquisition" and "Swipe volume" were analytics jargon. */
      acquisitionTitle: "New sign-ups",
      acquisitionDescription: "People joining MeetMyPets",
      swipeTitle: "Likes and passes",
      swipeDescription: "How people are swiping",
      swipeLikes: "Liked",
      swipePasses: "Passed",
      speciesTitle: "Active pets by species",
      speciesDescription: "Pets currently listed",
      peopleAgeTitle: "People by age",
      peopleAgeDescription: "Accounts, from the birth date on their profile",
      peopleAges: {
        under18: "Under 18",
        "18to24": "18–24",
        "25to34": "25–34",
        "35to44": "35–44",
        "45to54": "45–54",
        "55plus": "55+",
        unknown: "Not given",
      },
      petsTitle: "Accounts with a pet",
      petsDescription: "Everyone who signed up",
      withPet: "Has a pet",
      withoutPet: "No pet yet",
      devicesTitle: "Phones registered",
      devicesDescription: "Active devices, not people — some own several",
      unitAccounts: "accounts",
      unitPhones: "phones",
      unitPets: "pets",
      /** Appended to a description, e.g. "New sign-ups · per week". */
      perBucket: { day: "per day", week: "per week", month: "per month" },
      showData: "Show data",
      hideData: "Hide data",
      tableDate: "Period",
      tableValue: "Value",
    },
    chartTypes: {
      /** Prefixes the chart name for screen readers: "Chart type for New sign-ups". */
      label: "Chart type for",
      area: "Area",
      line: "Line",
      bar: "Bar",
      horizontal: "Horizontal bar",
      donut: "Donut",
    },
    location: {
      title: "Where users are",
      description: "All accounts · not affected by the date range",
      mapLabel: "Map of India shaded by number of accounts per state",
      /** `{state}` is the state's name. */
      stateMapLabel: "Map of {state} shaded by number of accounts per district",
      viewIndia: "All India",
      viewState: "By state",
      pickState: "State",
      clickToOpen: "Click to see its districts",
      indiaHint: "Click a state to see its districts.",
      backToIndia: "Back to all India",
      /** `{count}` users, `{share}` percent of all accounts. */
      stateTotal: "{count} users · {share}% of all accounts",
      noDistrict: "Placed by typed state, no GPS",
      stateEmpty: "No account is located in this state yet.",
      districtsLoading: "Loading districts…",
      topStates: "Top states",
      topDistricts: "Top districts",
      topCities: "Top cities",
      tableDistrict: "District",
      users: "users",
      /** `{located}` of `{total}` accounts placed on the map. */
      coverage: "{located} of {total} accounts placed on the map",
      outsideIndia: "Outside India",
      unknown: "No location",
      fromGps: "from GPS",
      fromText: "from typed state",
      noLocations: "No account has a location yet.",
      tableState: "State",
      tableCity: "City",
      tableUsers: "Users",
      tableShare: "Share",
      mapFailed: "The map could not be drawn. The lists beside it are still accurate.",
    },
    /**
     * The one time control. `month`/`year` are TRAILING windows, not
     * calendar-to-date — "the last 12 months" stays useful on January 2nd,
     * where "this year so far" is one day of data.
     */
    range: {
      label: "Period",
      from: "From",
      to: "To",
      presets: {
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        "90d": "Last 90 days",
        month: "Last month",
        year: "Last year",
        custom: "Custom range…",
      },
      /** `{date}` is replaced with the first date that has data. */
      clamped: "Data begins {date}.",
    },
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
      blocked: "Blocked",
      deleted: "Deleted",
      flagged: "Flagged",
    },
    columns: {
      user: "User",
      contact: "Contact",
      pets: "Pets",
      status: "Status",
      joined: "Joined",
      lastActive: "Last active",
      lastLogin: "Last sign-in",
      pet: "Pet",
      species: "Species",
      owner: "Owner",
      added: "Added",
      followers: "Followers",
      likes: "Likes",
      matches: "Matches",
      trust: "Trust",
      actions: "Actions",
    },
    /** Prefix for the trust link's accessible name; the pet and band follow. */
    trustAria: "Review trust for",
    /** Row-level navigation. The aria label names the row, not "this row". */
    view: {
      label: "View",
      /** `{name}` is substituted with the display name or the account id. */
      aria: "View {name}",
      unnamed: "unnamed account",
    },
    empty: "No matches. Try a different search or filter.",
    /** Shown instead of `empty` when a filter is what emptied the table. */
    emptyFiltered: "No matches for these filters.",
    clearFilters: "Clear filters",
    /**
     * Filter labels. Phone is "has a number", not "verified": phone_verified is
     * false for every account today, so a verified filter would always return
     * nothing and read as a broken screen rather than an honest one.
     */
    filters: {
      any: "Any",
      yes: "Yes",
      no: "No",
      emailVerified: "Email verified",
      hasPhone: "Has phone",
      hasPets: "Has pets",
      joinedFrom: "Joined from",
      joinedTo: "Joined to",
      species: "Species",
      trust: "Trust",
      trustAll: "Any",
      trustAtRisk: "Needs review",
      trustTempBanned: "Temporarily banned",
      trustPermBanned: "Permanently banned",
      trustNormal: "Normal",
      allSpecies: "All species",
    },
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
    /** One-click chips above the Users and Pets tables. */
    quick: {
      label: "Quick filter",
      all: "All",
      active: "Active",
      suspended: "Suspended",
      banned: "Banned",
      hasPets: "Has pets",
      archived: "Archived",
      flagged: "Flagged",
      needsReview: "Needs review",
      tempBanned: "Temp banned",
      permBanned: "Banned",
    },
    ownerFilter: {
      showing: "Showing only pets owned by",
      /** Used when the owner has no pets visible to read a name from. */
      thisUser: "this user",
      showAll: "Show all pets",
      back: "Back to users",
    },
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
      blog_post: "Blog post",
      blog_category: "Blog category",
      ai_decision: "AI decision",
      team_message: "Team message",
      welcome: "Welcome message",
    },
    /**
     * An empty audit log is the normal state on a fresh install, not an
     * error — the copy should reassure rather than alarm.
     */
    empty: "No admin actions recorded yet.",
    emptyFiltered: "No actions match these filters.",
    viewAccount: "Open account",
    details: "Details",
    /** Colour key above the table; one entry per group in `audit-format.ts`. */
    tones: {
      legend: "Colour key",
      restrict: "Restricts or removes",
      restore: "Approves or restores",
      caution: "Takes down",
      content: "Edits content",
      message: "Sends a Team message",
      neutral: "Reviewed only",
    },
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
      "blog.create": "Blog post created",
      "blog.update": "Blog post edited",
      "blog.publish": "Blog post published",
      "blog.unpublish": "Blog post unpublished",
      "blog.delete": "Blog post deleted",
      "blog_category.create": "Blog category added",
      "ai_decision.approve": "AI decision approved",
      "ai_decision.reject": "AI decision rejected",
      "team_message.send": "Team message sent",
      "team_message.schedule": "Team message scheduled",
    },
    // Backend-written Team message actions not listed above read as "<subject> <verb>" from these words.
    teamActionWords: {
      subjects: { team_message: "Team message", welcome: "Welcome message", team_welcome: "Welcome message" },
      verbs: {
        send: "sent",
        schedule: "scheduled",
        edit: "edited",
        update: "edited",
        delete: "deleted",
        cancel: "cancelled",
        set: "saved",
        stop: "stopped",
      },
    },
  },
  aiReports: {
    title: "AI Reports",
    description:
      "Photos and videos our AI has checked. It handles the clear cases on its own and sends the rest here. Confirm or correct it — your corrections train the next version.",
    searchPlaceholder: "Search by file name, or paste a pet or decision ID…",
    filters: {
      review: "Show",
      media: "Where it was posted",
      content: "Photo or video",
      all: "Everything",
      clear: "Clear filters",
    },
    columns: {
      media: "Media",
      item: "Item",
      aiSaid: "AI key points",
      answer: "Moderator's decision",
      action: "Action",
      status: "Status",
    },
    review: {
      question: "Is the AI's decision right?",
      aiContext: {
        APPROVED: "AI approved",
        REJECTED: "AI rejected",
        HUMAN_REVIEW: "AI wasn't sure; agreeing rejects the post",
      },
      aiRight: "Approve: AI is right",
      aiWrong: "Reject: AI is wrong",
      whyWrong: "Why is the AI wrong?",
      pickReasonPlaceholder: "Pick a reason…",
      codeLabel: "Code for the rejection",
      pickCodePlaceholder: "Pick a code…",
      outcomePrefix: "Post will be",
      outcomeBlocked: "rejected",
      outcomePublished: "approved",
      aiGenLabel: "AI generated",
      noteLabel: "Note (optional)",
      noteRequired: "Note (required for Other)",
      notePlaceholder: "What you saw",
      submit: "Submit",
      saving: "Saving…",
      done: "Reviewed",
      agreed: "Agreed with the AI",
      overturned: "Overturned the AI",
      savingToast: "Saving your decision…",
      approvedToast: "Approved — now visible in the app",
      rejectedToast: "Rejected — hidden from the app",
      savedToast: "Decision saved",
      contentWriteFailed:
        "Your decision was saved, but the post itself did not change — it is still as it was in the app. Tell an engineer.",
    },
    /**
     * An empty queue is the goal state, not an error — but an empty *filtered*
     * view usually means the filter, so the two read differently.
     */
    empty: "Nothing is waiting for review. The AI is keeping up.",
    emptyFiltered: "Nothing matches these filters.",
    /* One status replaces the old "AI verdict" + "Review" pair — see lib/ai-moderation-status.ts. */
    /* Two outcomes, not four: who decided is said in words underneath, not in the badge. */
    statusLabels: {
      waiting_ai_approved: "AI says approve",
      waiting_ai_rejected: "AI says reject",
      waiting_ai_unsure: "AI wasn't sure",
      published: "Approved by the AI",
      blocked: "Rejected by the AI",
      published_by_human: "Approved",
      blocked_by_human: "Rejected",
    },
    statusHelp: {
      waiting_ai_approved: "The AI would let this through, but it is waiting for you to confirm.",
      waiting_ai_rejected: "The AI would block this, but it is waiting for you to confirm.",
      waiting_ai_unsure: "The AI could not decide. It needs your judgement.",
      published: "The AI was sure this was fine and let it through. Nobody reviewed it.",
      blocked: "The AI was sure this broke the rules and stopped it. Nobody reviewed it.",
      published_by_human: "A moderator checked this and approved it.",
      blocked_by_human: "A moderator checked this and rejected it.",
    },
    /* Plain words for the row: "post_media" and "image" are database terms. */
    itemLabels: {
      "pet_media:image": "Photo in a post",
      "pet_media:video": "Video in a post",
      "post_media:image": "Photo in a post",
      "post_media:video": "Video in a post",
      "pet_profile_photo:image": "Pet profile photo",
      "pet_profile_photo:video": "Pet profile video",
    },
    media: {
      noFile: "No file",
      enlarge: "Click to see it full size",
      video: "VIDEO",
    },
    owner: {
      title: "Uploader",
      joined: "Joined",
      lastSeen: "Last seen",
      never: "Never signed in",
      pets: "pets",
      onePet: "1 pet",
      trust: "Trust",
      clean: "No moderation action ever taken",
      pastActions: "past actions, none active",
      openFull: "Open full profile",
    },
    row: {
      uploadedBy: "Uploaded by",
      noPet: "No pet linked",
      fakeImage: "Not a real photo",
      /* Badges are exceptions, so each has to teach itself on hover. */
      fakeImageHelp:
        "The AI thinks this picture was generated by a computer rather than taken with a camera. The number is how sure it is.",
      serious: "Very bad",
      seriousHelp:
        "Not a close call. The AI is certain this breaks the rules — things like animal abuse, or a file the virus scanner flagged.",
      whyStopped: "Why the AI stopped it",
      viewProfile: "Open this user's profile",
    },
    /* Plain words for the model's own output, used in the detail panel only. */
    decisionLabels: {
      APPROVED: "Approved",
      HUMAN_REVIEW: "Asked for a person",
      REJECTED: "Rejected",
    },
    reviewFilterLabels: {
      needs_review: "Needs review — all",
      needs_review_ai_approved: "Needs review — AI says approve",
      needs_review_ai_rejected: "Needs review — AI says reject",
      needs_review_ai_unsure: "Needs review — AI wasn't sure",
      approved_by_moderator: "Approved by a moderator",
      rejected_by_moderator: "Rejected by a moderator",
      approved_by_ai: "Approved by the AI",
      rejected_by_ai: "Rejected by the AI",
    },
    /* Both are a photo in a post — two tables, one user-facing thing (see the seed script's note). */
    mediaLabels: {
      pet_media: "In a post",
      post_media: "In a post",
      pet_profile_photo: "Pet profile photo",
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
    banEnds: {
      /** `{left}` is e.g. "in 2d". */
      label: "Ban ends {left}",
      ended: "Ban ended",
      title: "Temporary ban lifts on {date}",
      endedTitle: "Ban end date {date} has passed — the score may still need a review",
    },
    /**
     * Trust is the backend's automated signal. The panel used to only display
     * it; that stopped being true when the trust review queue shipped, and
     * again when dismissing a report began crediting its deduction back.
     */
    trustHint:
      "Automated trust score, owned by the app backend. The panel changes it only by restoring a pet in Trust review, or by crediting back the deduction from a dismissed report.",
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
    /**
     * What dismissing does to the trust score the report cost the pet.
     *
     * Every outcome is stated, including the ones where nothing happens: a
     * refund that quietly did not occur is worse than one that never claimed
     * to. `{delta}` and `{score}` are substituted.
     */
    revert: {
      heading: "Trust score",
      reverted: "Returns +{delta} to this pet, taking it to {score}.",
      revertedDone: "Returned +{delta} to this pet. Now {score}.",
      no_deduction: "No deduction on record for this report — nothing to return.",
      already_reverted: "Already returned by an earlier dismissal.",
      still_earned:
        "Another report from the same reporter shares this deduction, so it stands.",
      would_restore:
        "Returning it would land on exactly 555, which the app reads as a full restore and would lift this pet's ban. Use Trust review if that is what you intend.",
      score_moved:
        "The score changed while this was being saved, so nothing was returned. Check Trust review.",
      failed: "The report was dismissed, but the trust credit failed. Check Trust review.",
    },
    /** "Mark actioned" applies the app's automatic penalty again (−80 profile, −20 post). */
    penalty: {
      heading: "If marked actioned",
      preview: "Takes −{delta} more from this pet: {before} → {after}.",
      previewNoScore: "Takes −{delta} more from this pet.",
      bansWarning: "That moves the pet into the “{status}” band.",
      done: "Took −{delta} from this pet. Now {score}.",
      penalized: "Trust penalty applied.",
      already_penalized: "This report already took its penalty — nothing more was deducted.",
      no_score: "This pet has no trust score, so nothing was deducted.",
      score_moved: "The score changed while this was being saved, so nothing was deducted. Check Trust review.",
      unavailable:
        "Report marked actioned, but the trust penalty is not set up yet (database migration pending). Nothing was deducted.",
      failed: "The report was actioned, but the trust penalty failed. Check Trust review.",
    },
  },
  verifications: {
    title: "Verifications",
    description: "Pet certificates awaiting review — vaccination, health and licence documents.",
    searchPlaceholder: "Search pet name, owner email, cert number, clinic, or paste an ID…",
    filters: {
      status: "Status",
      type: "Type",
      all: "All",
      clear: "Clear filters",
      expiredOnly: "Expired only",
      /** `{days}` comes from DAY_THRESHOLDS.countdown.amber. */
      expiringSoon: "Expiring in {days} days",
    },
    expiry: {
      /** `{left}` is e.g. "in 5d". */
      leftTitle: "Expires {left}",
      expiredTitle: "Already expired",
    },
    columns: {
      submitted: "Submitted",
      pet: "Pet",
      type: "Type",
      /** Claimed expiry. Sorting ascending surfaces lapsed certificates. */
      expires: "Expires",
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
    searchPlaceholder: "Search pet name, owner email, or paste a pet / owner ID…",
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
      description: "Every automatic change to this pet's score, chronological order (first events first).",
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
    tabs: { species: "Species", breeds: "Breeds", schemas: "Attribute schemas", later: "Later" },
    statusLabels: { active: "Active", inactive: "Retired" },
    actions: { column: "Actions", edit: "Edit" },
    // {count} active pets use it
    petsInUse: "{count} active pets use this, so it can't be retired",
    noPets: "No active pets use this, so it can be retired",
    // {count}
    breedsCount: "{count} breeds under this species",
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
      /** Shown if the form somehow submits with no species chosen. */
      speciesRequired: "Pick a species.",
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
  blogs: {
    title: "Blogs",
    subtitle: "Write, publish and manage articles on meetmypets.app/blog.",
    create: "New article",
    searchPlaceholder: "Search by title…",
    filters: {
      status: "Status",
      category: "Category",
      allStatuses: "All statuses",
      allCategories: "All categories",
      clear: "Clear filters",
    },
    statusLabels: { draft: "Draft", published: "Published", unpublished: "Unpublished" },
    columns: {
      title: "Title",
      author: "Author",
      status: "Status",
      category: "Category",
      created: "Created",
      updated: "Updated",
      published: "Published",
      actions: "Actions",
    },
    uncategorised: "—",
    notPublished: "—",
    empty: "No articles yet. Write the first one.",
    emptyFiltered: "No articles match these filters.",
    rowActions: {
      menu: "Actions for {title}",
      view: "View on site",
      edit: "Edit",
      preview: "Preview",
      publish: "Publish",
      unpublish: "Unpublish",
      delete: "Delete",
    },
    confirm: {
      publish: {
        title: "Publish this article?",
        description:
          "It becomes public at its URL, appears on the blog and in the sitemap, and can be indexed by search engines.",
        confirm: "Publish",
      },
      unpublish: {
        title: "Unpublish this article?",
        description:
          "It disappears from the blog, its URL returns “not found”, and it leaves the sitemap. You can publish it again later.",
        confirm: "Unpublish",
      },
      delete: {
        title: "Delete this article?",
        description:
          "It is removed from the site and this list, and its URL is freed for another article. The record is kept in the database for audit, but there is no undo here.",
        confirm: "Delete article",
        reasonLabel: "Reason (recorded in the audit log)",
        reasonPlaceholder: "Why is this being removed?",
      },
      cancel: "Cancel",
      working: "Working…",
    },
    toast: {
      created: "Draft saved.",
      saved: "Changes saved.",
      published: "Published.",
      unpublished: "Unpublished.",
      deleted: "Article deleted.",
      categoryCreated: "Category added.",
      /** `{reason}` is the revalidation failure message. */
      stale: "Saved — but the public site may still show the old version. {reason}",
      retry: "Refresh site",
      refreshed: "Public site refreshed.",
      unaudited: "The change was saved, but writing the audit log failed. Tell an engineer.",
      previewBlocked: "Your browser blocked the preview window. Allow pop-ups for this site.",
    },
    editor: {
      newTitle: "New article",
      editTitle: "Edit article",
      back: "All articles",
      unsaved: "Unsaved changes",
      lastEditedBy: "Last edited by {who}",
      saveDraft: "Save draft",
      save: "Save changes",
      publish: "Publish",
      saveAndPublish: "Save & publish",
      unpublish: "Unpublish",
      preview: "Preview",
      previewHint: "Preview shows the last saved version. Save first to preview edits.",
      viewLive: "View live",
      saving: "Saving…",
      sections: {
        content: "Content",
        details: "Details",
        image: "Featured image",
        faq: "FAQ",
        seo: "Search & sharing",
      },
      fields: {
        title: "Title",
        slug: "URL slug",
        slugHint: "Changing the slug of a published article keeps the old address working as a permanent redirect.",
        slugAuto: "Generated from the title until you edit it.",
        excerpt: "Excerpt",
        excerptHint: "Shown on the blog card, and used as the meta description unless you set one below.",
        body: "Article body",
        category: "Category",
        noCategory: "No category",
        newCategory: "New category",
        newCategoryPlaceholder: "Category name",
        add: "Add",
        tags: "Tags",
        tagsHint: "Comma-separated. Used as structured-data keywords, not shown on the page.",
        author: "Author",
        authorHint: "“MeetMyPets Team” is published as the organisation; any other name as a person.",
        publishedAt: "Publish date",
        publishedAtHint: "Leave empty to stamp the moment you publish. Set a date to show an earlier or later one.",
        image: "Image",
        imageAlt: "Alt text",
        imageAltHint: "Describe the image for screen readers and search. Required to publish.",
        caption: "Caption",
        upload: "Upload image",
        replace: "Replace",
        remove: "Remove",
        uploading: "Uploading…",
        imageRules: "JPEG, PNG, WebP, AVIF or GIF, up to 5 MB. Ideal size 1200×800.",
        faqQuestion: "Question",
        faqAnswer: "Answer",
        faqAdd: "Add question",
        faqRemove: "Remove question",
        faqHint: "Shown at the end of the article and published as FAQ structured data.",
        seoTitle: "SEO title",
        seoTitleHint: "Defaults to the article title.",
        seoDescription: "Meta description",
        seoDescriptionHint: "Defaults to the excerpt.",
        canonical: "Canonical URL",
        canonicalHint:
          "Leave empty. Set it only if this article is a copy of a page elsewhere — the article then drops out of the sitemap.",
        ogImage: "Social share image",
        ogImageHint: "Defaults to the featured image.",
        /** `{n}` / `{max}` are substituted. */
        counter: "{n} / {max}",
        words: "{n} words · {m} min read",
      },
      toolbar: {
        paragraph: "Paragraph",
        h2: "Heading 2",
        h3: "Heading 3",
        h4: "Heading 4",
        bold: "Bold",
        italic: "Italic",
        bulletList: "Bulleted list",
        orderedList: "Numbered list",
        blockquote: "Quote",
        link: "Link",
        unlink: "Remove link",
        image: "Insert image",
        table: "Insert table",
        addRow: "Add row",
        addColumn: "Add column",
        deleteTable: "Delete table",
        cta: "Call-to-action button",
        rule: "Divider",
        undo: "Undo",
        redo: "Redo",
        linkPrompt: "Link address (https://…, /path, or mailto:)",
        linkInvalid: "That link is not allowed. Use https://, a /path on this site, or mailto:.",
        ctaLabelPrompt: "Button text",
        ctaHrefPrompt: "Button link (e.g. /#waitlist)",
        imageAltPrompt: "Describe this image (alt text)",
      },
    },
  },
  teamMessages: {
    title: "Team Messages",
    description: "Messages from the MeetMyPets Team chat. Users can read them but not reply.",
    bodyMax: 2000,
    reasonMax: 500,
    audiences: {
      all: "Everyone",
      species: "Animal types",
      pet: "One pet",
      pets: "Chosen pets",
      no_pet: "People without a pet",
      people: "Chosen people",
      place: "Country / state / city",
      nearby: "Near a point on the map",
    },
    states: {
      scheduled: "Scheduled",
      sent: "Sent",
      cancelled: "Cancelled",
      deleted: "Deleted",
      failed: "Failed",
      active: "Active",
      retired: "Retired",
    },
    kinds: {
      staff: "Team message",
      welcome: "Welcome message",
      pet_welcome: "Pet welcome message",
    },
    newMessage: "New message",
    linksFound: "Links in this message — open each to check it goes to the right page:",
    welcome: {
      navButton: "Welcome messages",
      title: "Welcome messages",
      description: "The automatic messages people get in their MeetMyPets Team chat when they sign up or add a pet.",
      back: "Back to Team messages",
      note: "Changes only reach new sign-ups and new pets. Everyone who already got a welcome keeps the exact text they received.",
      kinds: {
        welcome: { title: "New account", hint: "Sent to every new sign-up" },
        pet_welcome: { title: "New pet", hint: "Sent for every new pet" },
      },
      stopped: "Stopped",
      stoppedNote: {
        welcome: "Stopped — new sign-ups get no welcome until someone saves a text.",
        pet_welcome: "Stopped — new pets get no welcome until someone saves a text.",
      },
      textLabel: "Message text",
      insert: "Insert",
      placeholderNames: { user_name: "person's name", pet_name: "pet's name" },
      placeholderHint: "{user_name} becomes the person's name (\"friend\" if unknown). {pet_name} becomes the pet's name.",
      petNotAllowedHint: "Not available — a new account has no pet yet.",
      checks: {
        user_name: "Greets the person with {user_name}",
        pet_name: "Names the pet with {pet_name}",
        no_pet: "No {pet_name} — there's no pet yet",
      },
      tips: {
        add_user_name: "Optional: add {user_name} to greet the person by name",
        add_pet_name: "Optional: add {pet_name} to name the pet",
      },
      preview: "Preview",
      sampleUser: "Priya",
      samplePet: "Bruno",
      reasonLabel: "Reason (optional, saved in the audit log)",
      save: "Save new version",
      saving: "Saving…",
      stop: "Stop",
      undo: "Undo changes",
      // {reached} is already a counted noun, e.g. "91 people"
      stats: "Reached {reached} · {read} read",
      // {who} {when}
      lastBy: "Current version by {who} · {when}",
      original: "Original version (set up by the app)",
      confirmSave: {
        // {kind}
        title: "Make this the {kind} welcome?",
        description: "From the next {who} on, people get this text. Anyone who already got a welcome keeps theirs.",
        confirm: "Save new version",
      },
      confirmStop: {
        title: "Stop the {kind} welcome?",
        description: "New {who} will get no welcome until someone saves a text. Nobody loses the welcome they already have.",
        confirm: "Stop welcome",
      },
      whoNext: { welcome: "sign-up", pet_welcome: "new pet" },
      whoPlural: { welcome: "sign-ups", pet_welcome: "pets" },
      toast: {
        saved: "New welcome text is live",
        savedDetail: { welcome: "Every new sign-up gets this text from now on.", pet_welcome: "Every new pet gets this text from now on." },
        stopped: "Welcome stopped",
        stoppedDetail: { welcome: "New sign-ups get no welcome until someone saves a text.", pet_welcome: "New pets get no welcome until someone saves a text." },
      },
      history: {
        title: "Earlier versions",
        hint: "Read-only. Kept so you can always see what people were sent.",
        empty: "No earlier versions yet — the original texts are still in use.",
        // {who}
        by: "Written by {who}",
        system: "Original (set up by the app)",
      },
    },
    composer: {
      title: "New Team message",
      description: "Users see it in their pinned MeetMyPets Team chat. They can't reply, and there is no notification.",
      back: "Back to history",
      bodyLabel: "Message",
      bodyPlaceholder: "Write your message. Plain text; links are allowed.",
      audienceLabel: "Who should receive it?",
      audienceHints: {
        all: "Every active pet, plus every active person with no pet",
        species: "Active pets of the animal types you pick",
        pet: "One pet you pick",
        pets: "Up to 1000 pets you pick",
        no_pet: "Only active people who have no pet yet",
        people: "Every active pet of each person you pick",
        place: "People whose profile country, state or city matches",
        nearby: "People within a distance of a point on the map",
      },
      comingSoon: "Coming soon",
      place: {
        intro: "Tick every spelling you want — people type places differently (\"India\", \"INDA\"). Within a list any name matches; across lists all must match.",
        levels: { countries: "Countries", states: "States", cities: "Cities" },
        filter: "Filter {level}",
        // {count} people with this place on their profile
        people: "{count}",
        peopleTitle: "People with this on their profile",
        none: "No names match.",
        loading: "Loading place names…",
        limit: "Up to 100 names per list.",
        noLocation: "People with no saved location are never reached.",
      },
      nearby: {
        intro: "Click the map to drop a pin, then set the distance.",
        lat: "Latitude",
        lng: "Longitude",
        radius: "Distance (km)",
        noPin: "No pin yet — click the map.",
        mapLabel: "Map. Click to choose the centre point.",
        attribution: "© OpenStreetMap contributors",
        noLocation: "People with no saved map position are never reached.",
      },
      schedule: {
        label: "When should it go out?",
        now: "Send now",
        later: "Schedule for later",
        at: "Date and time",
        // {zone}
        zone: "Your time zone: {zone}",
        past: "Pick a time in the future.",
        tooFar: "Pick a time within the next year.",
        missing: "Pick a date and time.",
        note: "It goes out within about a minute of this time. Who receives it is decided at that moment.",
      },
      speciesLabel: "Animal types",
      petsLabel: "Pets",
      peopleLabel: "People",
      petSearch: "Search pets by name or id",
      peopleSearch: "Search people by name, email or phone",
      searching: "Searching…",
      noResults: "No active matches.",
      recentPets: "Active pets — tick to choose, or search above",
      recentPeople: "Active people — tick to choose, or search above",
      sortLabel: "Order",
      sortNewest: "Newest",
      sortName: "A–Z",
      showMore: "Show more",
      loadingMore: "Loading…",
      // {shown} {total}
      showing: "Showing {shown} of {total}",
      recipients: {
        title: "Recipients",
        viewAll: "View all",
        // {names} {count}
        andMore: "{names} and {count} more",
        sheetTitle: "Who will receive it",
        sheetHint: "A preview from the admin lists. When it goes out, the database makes the final list and skips anyone banned or inactive.",
        allPets: "All active pets",
        noPetPeople: "People without a pet",
        chosenPets: "Chosen pets",
        chosenPeople: "Chosen people",
        // {species}
        speciesPets: "{species} (active pets)",
        locationNote: "For place and map audiences the database works out the list from saved locations, so only the counts are shown here.",
        incomplete: "Finish choosing the audience to see who it reaches.",
        none: "Nobody to list right now — the database will check again when it goes out.",
        loading: "Loading recipients…",
      },
      noPetList: {
        title: "These people will receive it",
        hint: "Active people with no pet yet. Everyone on this list gets it — no ticking needed.",
        empty: "Nobody active is without a pet right now.",
      },
      // {term}
      matchesFor: "Matches for “{term}”",
      selected: "{count} selected",
      remove: "Remove {name}",
      unnamed: "Unnamed",
      // {species} {owner}
      petMeta: "{species} · owner {owner}",
      reasonLabel: "Reason (optional, saved in the audit log)",
      reasonPlaceholder: "Team message",
      reach: {
        checking: "Counting who this reaches…",
        incomplete: "Finish choosing the audience to see who it reaches.",
        // {pets} {accounts} are already counted nouns, e.g. "1 pet", "15 people".
        reaches: "This will reach {pets} and {accounts} without a pet.",
        skippedPets: { one: "1 chosen pet was skipped (deleted, archived or banned).", other: "{count} chosen pets were skipped (deleted, archived or banned)." },
        skippedPeople: { one: "1 chosen person was skipped (inactive or suspended).", other: "{count} chosen people were skipped (inactive or suspended)." },
        nobody: "Nobody matches this audience right now.",
      },
      review: "Review and send",
      reviewSchedule: "Review and schedule",
      reviewCard: {
        eyebrowNow: "Review before sending",
        eyebrowLater: "Review before scheduling",
        when: "Delivery",
        now: "Immediately",
        nowHint: "Users see it as soon as you confirm.",
        who: "Audience",
        reach: "Reach",
        preview: "Preview",
        teamName: "MeetMyPets Team",
        pinned: "Pinned · read-only",
        repliesOff: "Replies are turned off for this chat",
        justNow: "now",
        // {count}
        more: "+{count} more",
        reason: "Audit reason",
        defaultReason: "Team message (default)",
        footNote: "No push notification or pop-up — users see it in their pinned chat.",
      },
      scheduleConfirm: {
        title: "Schedule this message?",
        // {time}
        description: "Nobody sees it before {time}. Until then you can edit or cancel it from the Scheduled tab.",
        when: "Goes out",
        estimate: "Estimate — the real audience is worked out when it goes out.",
        send: "Schedule",
        sending: "Scheduling…",
      },
      // {time}
      scheduledToast: "Scheduled for {time}",
      scheduledToastDetail: "Nobody sees it before then. You can still edit or cancel it from the Scheduled tab.",
      confirm: {
        title: "Send this message now?",
        description: "Users see it straight away. You can still edit or delete it afterwards from the history.",
        audience: "Audience",
        message: "Message",
        reason: "Reason",
        send: "Send now",
        sending: "Sending…",
        back: "Back",
      },
      sentToast: "Sent to {pets} and {accounts} without a pet",
      sentToastDetail: "It's in their MeetMyPets Team chat now. You can still edit or delete it from the Sent tab.",
      nouns: { pet: { one: "pet", other: "pets" }, person: { one: "person", other: "people" } },
    },
    history: {
      tabsLabel: "Message state",
      empty: {
        scheduled: "Nothing is scheduled.",
        sent: "No messages have been sent yet.",
        cancelled: "No cancelled messages.",
        deleted: "No deleted messages.",
        failed: "No failed messages. Good.",
        active: "No active welcome messages.",
        retired: "No older versions yet.",
      },
      failedBanner: "Some scheduled messages failed to send and reached nobody.",
      failedBannerAction: "Show failed",
      fromLabel: "From",
      toLabel: "To",
      quickRanges: { thisMonth: "This month", lastMonth: "Last month", nextMonth: "Next month" },
      quickRangesLabel: "Quick dates",
      // {from} {to}
      emptyRange: "No messages between {from} and {to} on this tab.",
      senderLabel: "Sent by",
      allSenders: "Anyone",
      systemSender: "System (automatic)",
      // {who} {count}
      senderOption: "{who} ({count})",
      audienceLabel: "Audience",
      allAudiences: "All audiences",
      searchLabel: "Search",
      searchPlaceholder: "Search message text…",
      clearFilters: "Clear filters",
      emptyFiltered: "No messages match these filters on this tab.",
      truncated: "This tab has more than 2,000 messages, so only the newest 2,000 are filtered and listed.",
      columns: {
        message: "Message",
        state: "State",
        audience: "Audience",
        reach: "Reach",
        sentBy: "Sent by",
        when: "When",
        actions: "Actions",
      },
      edited: "edited",
      automatic: "Automatic",
      system: "System",
      unknownAudience: "—",
      reach: "{pets} · {accounts}",
      // {read} {percent}
      read: "{read} read ({percent}%)",
      estimate: "Estimated when it goes out",
      when: {
        scheduled: "Goes out",
        failed: "Was due",
        sent: "Sent",
        cancelled: "Created",
        deleted: "Deleted",
        active: "Live since",
        retired: "Written",
      },
      failedReason: "Why it failed: {reason}",
      audienceDetail: {
        species: "{names}",
        pets: "{count} chosen",
        pet: "1 pet",
        people: "{count} chosen",
        // {km} {lat} {lng}
        nearby: "Within {km} km of {lat}, {lng}",
      },
      rowMenu: "Actions for this message",
      edit: "Edit",
      delete: "Delete for everyone",
      cancel: "Cancel sending",
    },
    actions: {
      reasonLabel: "Reason (saved in the audit log)",
      reasonPlaceholder: "e.g. Fixing a wrong date in the announcement",
      back: "Back",
      working: "Saving…",
      bodyLabel: "Message text",
      // {count} {max}
      counter: "{count} / {max}",
      edit: {
        title: "Edit message",
        sentDescription: "Everyone who received it sees the new text straight away, marked \"edited\".",
        scheduledDescription: "Nobody has received it yet, so it won't be marked \"edited\".",
        confirm: "Save changes",
        noChange: "Change the text or the time before saving.",
        timeLabel: "Goes out at",
      },
      delete: {
        title: "Delete this message for everyone?",
        description: "It disappears from every user's MeetMyPets Team chat straight away. This can't be undone.",
        confirm: "Delete for everyone",
      },
      cancel: {
        title: "Cancel this message?",
        description: "It will never be sent. This can't be undone.",
        confirm: "Cancel sending",
      },
      toast: {
        saving: "Saving…",
        edited: "Message updated",
        deleted: "Message deleted",
        cancelled: "Message cancelled",
      },
    },
    errors: {
      not_allowed: "Your account can't send or change Team messages. Only super admins and moderators can.",
      actor_required: "We couldn't tell who is sending. Sign in again and retry.",
      bad_audience: "Choose who should receive this message.",
      body_empty: "Write a message before sending.",
      body_too_long: "The message is too long. The limit is 2000 characters.",
      species_required: "Choose at least one animal type.",
      too_many_species: "Choose 50 animal types or fewer.",
      unknown_species: "One of the chosen animal types no longer exists. Refresh and choose again.",
      pets_required: "Choose at least one pet.",
      one_pet_only: "Choose exactly one pet for this option.",
      too_many_pets: "Choose 1000 pets or fewer.",
      people_required: "Choose at least one person.",
      too_many_people: "Choose 1000 people or fewer.",
      location_required: "Choose a place or a point on the map.",
      bad_location: "That place or map point isn't valid. Check it and try again.",
      too_many_places: "Choose 100 names or fewer in each place list.",
      bad_kind: "That welcome type isn't recognised. Reload the page and try again.",
      user_name_missing: "Add {user_name} so the person is greeted by name.",
      pet_name_missing: "Add {pet_name} so the pet is named.",
      pet_name_not_allowed: "The new-account welcome has no pet. Remove {pet_name}.",
      no_change: "Nothing changed — this is already the active text.",
      no_active_welcome: "This welcome is already stopped.",
      reason_too_long: "The reason is too long (max 500 characters).",
      cannot_change_welcome: "Welcome messages are changed from the Welcome messages page, not here.",
      unknown: "Something went wrong. Please try again.",
      network: "Can't reach the admin server. Check your connection, then try again.",
      notFound: "Team messages aren't available on this server yet. Reload the page; if it keeps happening, the admin app needs restarting or redeploying.",
      busy: "Too many requests. Wait a moment and try again.",
      server: "The server had a problem. Please try again.",
      badResponse: "The server sent an unexpected reply. Please try again.",
      retry: "Try again",
    },
  },
} as const;
