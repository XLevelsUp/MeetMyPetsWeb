/**
 * Single source of truth for every user-facing string on meetmypets.app.
 * Nothing is hardcoded in components — change copy here.
 *
 * PRE-LAUNCH COPY RULE
 * --------------------
 * MeetMyPets has not shipped. Nothing in this file may state a user count,
 * rating, download figure or event total as fact. Every `statsBanner` entry
 * describes how the product is *built* or research already done, both
 * verifiable today. If the app launches and you have audited numbers,
 * replace them here and flip `isLaunched` — that switch controls the CTA
 * wording and store badges.
 */

export const isLaunched = false;

/**
 * Real photo for an illustrative entry. Absent means icon-only display.
 * The pictured animal may not exactly match the entry's stated breed (the
 * available photo set doesn't cover every species/breed named below) — the
 * photo is a stand-in, same illustrative status as the entry itself, not a
 * claim about a real pet. See PRE-LAUNCH COPY RULE above.
 */
type PetPhoto = { src: string; alt: string };

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
    // SEO-researched search terms, India/global tier — kept placeless per
    "pet social app",
    "pet playdate app",
    "dog playdate app",
    "dog meetup app",
    "pet meetup app",
    "find pet friends near me",
    "dog friend app",
    "pet owners social network",
    "pet community forum",
    "online pet community",
    "pet owner community",
    "cat social network",
    "pet matchmaking app",
    "pet networking app",
    "local pet meetups",
    "best pet app",
    "best pet app India",
    "best dog social app",
    "best cat app",
    "pet app download",
    "puppy play date app",
    "meet my pets",
    "meetmypets app",
    // Place-tier terms — metadata/structured-data only, never on-page copy
    // (see areaServed in OrganizationLd / json-ld.tsx).
    "pet social app Tamil Nadu",
    "dog playdate Chennai",
    "cat meetup Coimbatore",
    "pet events Tamil Nadu",
    "pet meetup app India",
    "dog lover app",
  ],
  locale: "en_IN",
  twitter: "@meetmypetsapp",
  // Real handle, confirmed by the team — NOT derived from `twitter` above.
  // Both used to build this URL from the Twitter handle
  // (meetmypetsapp, no dot) via string replacement, which happened to be
  // wrong: the real Instagram handle is meetmypets.app (with a dot) — a
  // different string, not a transformation of the Twitter one.
  instagram: "https://www.instagram.com/meetmypets.app/",
} as const;

/**
 * WhatsApp floater target. `wa.me` requires the number in international
 * format with no leading `+`, spaces or punctuation — `display` keeps the
 * human-readable version for anything shown on screen (aria-label, tooltip).
 */
export const whatsapp = {
  display: "+91 90470 55888",
  href: "https://wa.me/919047055888",
  message: "Hi! I'm curious about MeetMyPets 🐾",
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
  badge: "Built for every whisker, wing & wag",
  // Split for the kinetic mask reveal — each entry animates as one line.
  // Kept short (2-4 words) on purpose: MaskedLine's mask-reveal reads best
  // on short lines, and long lines wrap awkwardly inside the overflow mask
  // at the 375px anchor of --text-hero.
  headlineLines: ["Your pet's", "next best friend", "is closer", "than you think."],
  headlinePlain: "Your pet's next best friend is closer than you think.",
  subhead:
    "Playdates, breeding matches, local meetups and pet pros your neighbours already trust — all in one app, for every species you love, from the dog next door to the gecko three streets over.",
} as const;

/**
 * Illustrative hero persona — the same "Mochi" mascot used in the
 * verification toggle and species marquee (feature-bento.tsx), given a
 * richer, more specific bio for the hero mockup card. Not a real profile;
 * see PRE-LAUNCH COPY RULE above — no claims about real users. `photo` is a
 * stand-in image (not an actual Shiba Inu — see the PetPhoto note above).
 */
export const heroPersona = {
  name: "Mochi",
  species: "Shiba Inu",
  age: "3 yrs",
  distance: "Within 1.2 km",
  bio: "Loves a slow sniff walk, bad at sharing tennis balls.",
  tags: ["Playdate", "Park regular", "Vaccinated"],
  photo: { src: "/pet-yorkshire-terrier.webp", alt: "Mochi" } satisfies PetPhoto,
} as const;

/**
 * Dark stats banner, right after the hero. The hero itself used to carry
 * its own small proof-points row (All / 3 / 0) directly beneath the CTA
 * buttons — removed in favour of this single banner once both existed on
 * the page at once and visibly duplicated the same "here are some numbers"
 * moment back to back. This is now the one stats moment on the page.
 *
 * PRE-LAUNCH COPY RULE still applies: none of these are user/download
 * counts. Each is either research already done or a structural fact about
 * the product, both true today regardless of `isLaunched`:
 *
 * - surveyed: real pre-launch research count (confirmed by the team).
 * - species / breeds: verified against the production database's
 *   `pets.species` (6 rows) / `pets.breeds` (34 rows) — see
 *   docs/admin/schema-notes.md "Taxonomy management" — not the marketing
 *   site's own smaller illustrative `speciesMarquee` grouping.
 * - ecosystemPillars: matches `ecosystem.length` above (parents /
 *   enthusiasts / businesses) — update together if that array's shape ever
 *   changes.
 */
export const statsBanner = [
  { value: 100, suffix: "+", label: "Pet Owners Surveyed" },
  { value: 6, suffix: "", label: "Species Supported" },
  { value: 34, suffix: "+", label: "Breeds Catalogued" },
  { value: 3, suffix: "", label: "Products, One Ecosystem" },
] as const;

/** `photo` is a stand-in illustrative image for the panel, not tied to any
 * specific pet mentioned in its copy — see the PetPhoto note above. */
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
    photo: { src: "/pet-dachshund-bows.webp", alt: "A pet ready for a playdate" } satisfies PetPhoto,
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
    photo: { src: "/pet-hamster.webp", alt: "One of the many companion species in the community feed" } satisfies PetPhoto,
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
    photo: { src: "/pet-goldendoodle.webp", alt: "A well-groomed pet, cared for by a verified local business" } satisfies PetPhoto,
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

/**
 * Sample profiles for the multi-species marquee. Illustrative, not real
 * users. `photo` is present only where a stand-in photo exists — entries
 * without one (currently the bird/rabbit/reptile entries, since the
 * available photo set has no shots of those species) fall back to the
 * existing species icon rather than showing a mismatched or missing image.
 */
export const speciesMarquee = [
  { name: "Mochi", species: "Shiba Inu", emojiless: "dog",
    photo: { src: "/pet-yorkshire-terrier.webp", alt: "Mochi" } satisfies PetPhoto },
  { name: "Pepper", species: "Bengal Cat", emojiless: "cat",
    photo: { src: "/pet-cat-ginger-longhair.webp", alt: "Pepper" } satisfies PetPhoto },
  { name: "Kiwi", species: "Indian Ringneck", emojiless: "bird" },
  { name: "Nimbus", species: "Holland Lop", emojiless: "rabbit" },
  { name: "Basil", species: "Leopard Gecko", emojiless: "reptile" },
  { name: "Coco", species: "Indie / Desi", emojiless: "dog",
    photo: { src: "/pet-corgi-puppy.webp", alt: "Coco" } satisfies PetPhoto },
  { name: "Olive", species: "Persian Cat", emojiless: "cat",
    photo: { src: "/pet-maine-coon.webp", alt: "Olive" } satisfies PetPhoto },
  { name: "Rio", species: "Cockatiel", emojiless: "bird" },
] as const;

/** Illustrative directory entries — placeholder businesses, clearly generic. */
export const nearbyBusinesses = [
  { name: "Paws & Claws Veterinary", type: "Veterinary clinic", distance: "1.2 km" },
  { name: "The Grooming Room", type: "Grooming studio", distance: "2.4 km" },
  { name: "Good Dog Training Co.", type: "Behaviour training", distance: "3.1 km" },
] as const;

/**
 * One illustrative pet photo per "How it works" step. Shown blob-clipped in
 * the desktop sticky panel and as a small thumbnail on mobile step cards.
 * Order mirrors `howItWorks` below — update together.
 */
/**
 * `objectPosition` overrides the default `object-top` used for all step photos.
 * Pet photos vary: some dogs face top-center, others are centered in the frame.
 * Tune per entry so the face is always in the blob-clipped viewport.
 */
export const howItWorksPhotos: (PetPhoto & { objectPosition?: string })[] = [
  { src: "/pet-yorkshire-terrier.webp", alt: "A Yorkshire Terrier ready to be added to a profile" },
  { src: "/pet-corgi-puppy.webp",        alt: "A Corgi puppy discovered nearby" },
  { src: "/pet-cat-grey-shorthair.webp", alt: "A grey shorthair cat ready to meet", objectPosition: "top" },
  { src: "/pet-samoyed-puppy.webp",      alt: "A Samoyed joining the local community" },
];

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

/**
 * A future-facing promise ("the first 10,000 to join get VIP access"), not a
 * claim about how many people have already joined as USERS OF THE APP —
 * that distinction matters per the PRE-LAUNCH COPY RULE at the top of this
 * file. The count itself is real (see below), but it is a cap on an offer
 * the company is committing to, not a claim like "10,000 people already use
 * MeetMyPets" — the app has not launched.
 *
 * `remaining` IS live: VipBadge (components/ui/vip-badge.tsx) fetches
 * `lib/vip-count.ts`, which reads `identity.accounts` — registered
 * accounts, i.e. the admin panel's own database — via the one
 * unauthenticated route in apps/admin
 * (`apps/admin/src/app/api/public/vip-count`). If that fetch fails or the
 * endpoint is unconfigured, VipBadge falls back to `badge` below with no
 * number at all — it must never show a stale, guessed, or hardcoded count.
 * `perk` stays intentionally generic — the exact VIP benefit is still
 * undecided; update it here once it's finalised, without touching either
 * placement.
 */
export const vipOffer = {
  badge: "First 10,000 get VIP access",
  perk: "Join now and lock in founding-member perks before the doors even open.",
  cap: 10_000,
} as const;

/**
 * Timed pop-up shown once per visitor (localStorage-gated — see
 * WaitlistPopup) a short while after they land. Copy is shorter than the
 * full `waitlist` section on purpose: a modal competes for a much smaller
 * attention budget than a scrolled-to section does.
 */
export const waitlistPopup = {
  eyebrow: "Before you go",
  title: "Don't miss the first tail wag",
  body: "MeetMyPets is almost ready. Join the waitlist and we'll let you know the moment doors open — nothing else, ever.",
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
      // Required by Google Play's Data Safety form, which expects the deletion
      // instructions to be findable from the site without signing in.
      { label: "Delete your account", href: "/delete-account/" },
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
