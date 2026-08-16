/**
 * Single source of truth for every user-facing string on meetmypets.app.
 * Nothing is hardcoded in components — change copy here.
 *
 * PRE-LAUNCH COPY RULE
 * --------------------
 * MeetMyPets has not shipped. Nothing in this file may state a user count,
 * rating, download figure or event total as fact. Every `proofPoints` entry
 * describes how the product is *built*, which is verifiable today. If the app
 * launches and you have audited numbers, replace them here and flip
 * `isLaunched` — that switch controls the CTA wording and store badges.
 */

export const isLaunched = false;

export const site = {
  name: "MeetMyPets",
  domain: "meetmypets.app",
  url: "https://meetmypets.app",
  // Full registered name — legal pages and Organization JSON-LD must use the
  // name on the incorporation record, not an abbreviation.
  legalEntity: "XLU Technologies Private Limited",
  tagline: "Find friends, playmates and perfect matches for your pets.",
  description:
    "MeetMyPets is a multi-species pet ecosystem: verified playdates and breeding matches, community groups and local events, plus a directory of vetted pet businesses.",
  keywords: [
    "pet matching app",
    "verified dog breeding",
    "local pet playdates",
    "pet care ecosystem",
    "pet social network",
    "vaccination verified pets",
    "pet business directory",
    "multi-species pet app",
  ],
  locale: "en_IN",
  twitter: "@meetmypetsapp",
} as const;

export const nav = [
  { label: "Features", href: "#features" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Verification", href: "#verification" },
  { label: "Community", href: "#how-it-works" },
  { label: "For Businesses", href: "#businesses" },
] as const;

export const cta = {
  primary: isLaunched ? "Download for iOS & Android" : "Join the Waitlist",
  secondary: "Explore the Ecosystem",
  secondaryHref: "#ecosystem",
  waitlistHref: "#waitlist",
} as const;

export const hero = {
  badge: "The multi-species pet ecosystem",
  // Split for the kinetic mask reveal — each entry animates as one line.
  headlineLines: ["Where every pet", "finds their tribe", "& every owner", "finds trust."],
  headlinePlain: "Where every pet finds their tribe & every owner finds trust.",
  subhead:
    "Verified playdates, breeding matches, local events and top-rated pet services — designed to live in one app, for every species you care for.",
} as const;

/**
 * Claims about how the product is designed. All true pre-launch.
 * `value` renders through the CountUp component when `countTo` is set.
 */
export const proofPoints = [
  {
    value: "All",
    label: "Companion species",
    detail: "Dogs, cats, birds, rabbits, reptiles and more — not a dogs-only app.",
  },
  {
    value: "3",
    countTo: 3,
    label: "Verification stages",
    detail: "Owner ID, vaccination document check, then a badge that can expire.",
  },
  {
    value: "0",
    countTo: 0,
    label: "Exact locations shared",
    detail: "Proximity bands only. Precise GPS never leaves the device.",
  },
] as const;

export const ecosystem = [
  {
    id: "parents",
    eyebrow: "For pet parents",
    title: "Find the right match, not just the nearest one",
    body: "Swipe through pets near you for playdates, friendships or vaccination-verified breeding. Chat before you meet, and keep every conversation tied to a verified profile.",
    points: [
      "Swipe discovery with intent filters",
      "Pre-match chat before any meetup",
      "Vaccination-verified breeding matches",
      "Playdate scheduling with local parents",
    ],
  },
  {
    id: "enthusiasts",
    eyebrow: "For pet lovers",
    title: "You do not need to own a pet to belong here",
    body: "Follow the feed, join breed and species groups, and show up to local events. Full community access with no pet profile required.",
    points: [
      "Instagram-style multi-species feed",
      "Breed and species interest groups",
      "Local meetups, adoption drives, shows",
      "No pet required to participate",
    ],
  },
  {
    id: "businesses",
    eyebrow: "For pet businesses",
    title: "Reach owners who are already nearby",
    body: "Vets, groomers, trainers and boarders get a verified listing, geo-targeted visibility and a direct line to the community — without buying ads.",
    points: [
      "Verified professional listing",
      "Geo-targeted local discovery",
      "Direct community engagement",
      "Event and service announcements",
    ],
  },
] as const;

export const bentoFeatures = {
  discovery: {
    title: "Smart discovery",
    body: "Swipe right for a playdate, left to skip. Intent is set upfront so a breeding match never lands in a friendship queue.",
  },
  verification: {
    title: "Trust you can see",
    body: "An unverified profile and a verified one never look the same. The badge is earned, and it expires when a vaccination lapses.",
  },
  species: {
    title: "Every companion species",
    body: "Rabbits, parrots and reptiles get first-class profiles — not a dropdown labelled 'Other'.",
  },
  businesses: {
    title: "Professionals nearby",
    body: "Verified vets, groomers and trainers surfaced by proximity band, never by exact address.",
  },
} as const;

/** Sample profiles for the multi-species marquee. Illustrative, not real users. */
export const speciesMarquee = [
  { name: "Mochi", species: "Shiba Inu", emojiless: "dog" },
  { name: "Pepper", species: "Bengal Cat", emojiless: "cat" },
  { name: "Kiwi", species: "Indian Ringneck", emojiless: "bird" },
  { name: "Nimbus", species: "Holland Lop", emojiless: "rabbit" },
  { name: "Basil", species: "Leopard Gecko", emojiless: "reptile" },
  { name: "Coco", species: "Indie / Desi", emojiless: "dog" },
  { name: "Olive", species: "Persian Cat", emojiless: "cat" },
  { name: "Rio", species: "Cockatiel", emojiless: "bird" },
] as const;

/** Illustrative directory entries — placeholder businesses, clearly generic. */
export const nearbyBusinesses = [
  { name: "Paws & Claws Veterinary", type: "Veterinary clinic", distance: "1.2 km" },
  { name: "The Grooming Room", type: "Grooming studio", distance: "2.4 km" },
  { name: "Good Dog Training Co.", type: "Behaviour training", distance: "3.1 km" },
] as const;

export const howItWorks = [
  {
    step: "01",
    title: "Build a profile",
    body: "Add your pet — any species. Upload vaccination records once and they carry across every match, group and booking.",
  },
  {
    step: "02",
    title: "Discover nearby",
    body: "Swipe through pets and businesses in your proximity band. Set intent first so you only see relevant matches.",
  },
  {
    step: "03",
    title: "Match and chat",
    body: "Both sides opt in before a conversation opens. Chat, agree on a place, and meet when you are both ready.",
  },
  {
    step: "04",
    title: "Join the community",
    body: "Follow the feed, join breed groups, and turn up to local events with people whose pets you already know.",
  },
] as const;

export const verificationSteps = [
  {
    step: "01",
    title: "Owner identity check",
    body: "A government-issued ID confirms a real person stands behind the profile. Documents are checked, not published.",
  },
  {
    step: "02",
    title: "Vaccination document review",
    body: "Vaccination records are read automatically and matched against the pet on the profile.",
  },
  {
    step: "03",
    title: "Verified badge issued",
    body: "The profile carries a visible badge. It lapses when a vaccination expires, so the badge always means something current.",
  },
] as const;

export const faq = [
  {
    q: "Is MeetMyPets only for dogs and cats?",
    a: "No. MeetMyPets is built for companion animals of every kind — dogs, cats, birds, rabbits, reptiles, small mammals and more. Species-specific fields, groups and matching rules are first-class, not an afterthought bolted onto a dog app.",
  },
  {
    q: "How is my exact location protected?",
    a: "Your precise GPS coordinates are never shown to another user. Discovery works on coarse proximity bands — another owner sees 'within 1 km', never a point on a map or an address. You choose where to actually meet, in chat, after you have both matched.",
  },
  {
    q: "How does pet verification work?",
    a: "Verification runs in three stages: a government-issued ID check confirms the owner is a real person, vaccination documents are reviewed against the pet on the profile, and a visible badge is then issued. The badge lapses automatically when a vaccination expires, so it always reflects current records rather than a one-time check.",
  },
  {
    q: "Do I need to own a pet to join?",
    a: "No. Pet enthusiasts can join the feed, follow breed and species groups, and attend local events without creating a pet profile. Matching and breeding features require a verified pet, but the community does not.",
  },
  {
    q: "How do pet businesses get listed?",
    a: "Vets, groomers, trainers and boarding services apply for a verified listing. Once credentials are confirmed, the business appears in local discovery for owners in the surrounding proximity bands and can post services and events to the community.",
  },
  {
    q: "When does the app launch?",
    a: "We are in pre-launch. Join the waitlist and you will hear from us directly when iOS and Android builds are ready — no marketing blasts in the meantime.",
  },
] as const;

export const waitlist = {
  eyebrow: "Early access",
  title: "Be there when the doors open",
  body: "Join the waitlist with an email address or a mobile number. We will contact you once, when the app is ready to install.",
  successTitle: "You are on the list",
  successBody: "We will reach out the moment MeetMyPets is ready. Nothing else, we promise.",
  consent:
    "By joining you agree we may contact you about the MeetMyPets launch. We do not sell or share your details.",
} as const;

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Ecosystem", href: "#ecosystem" },
      { label: "Verification", href: "#verification" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "For pet parents", href: "#ecosystem" },
      { label: "For pet lovers", href: "#ecosystem" },
      { label: "For businesses", href: "#businesses" },
      { label: "Join the waitlist", href: "#waitlist" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy/" },
      { label: "Terms of service", href: "/terms/" },
      { label: "Data protection", href: "/privacy/" },
      { label: "Contact", href: "mailto:hello@meetmypets.app" },
    ],
  },
] as const;

export const footer = {
  blurb:
    "A multi-species pet ecosystem — community, discovery and verified professionals in one app.",
  compliance:
    "Personal data is handled in accordance with India's Digital Personal Data Protection Act, 2023.",
  note: isLaunched
    ? "Available on iOS and Android."
    : "iOS and Android apps are in development. Join the waitlist to hear first.",
} as const;
