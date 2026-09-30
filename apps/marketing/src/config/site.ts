// Every user-facing string. PRE-LAUNCH COPY RULE: no user count, rating or download figure stated as fact until `isLaunched` flips.

export const isLaunched = false;

// Stand-in photo for an illustrative entry — the animal may not match the stated breed, and is never a claim about a real pet.
type PetPhoto = { src: string; alt: string };

export const site = {
  name: "MeetMyPets",
  domain: "meetmypets.app",
  url: "https://meetmypets.app",
  // Legal pages and Organization JSON-LD need the name on the incorporation record, not an abbreviation.
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
    // SEO-researched search terms, India/global tier — kept placeless.
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
    // Place-tier terms — metadata/structured-data only, never on-page copy (see areaServed in json-ld.tsx).
    "pet social app Tamil Nadu",
    "dog playdate Chennai",
    "cat meetup Coimbatore",
    "pet events Tamil Nadu",
    "pet meetup app India",
    "dog lover app",
  ],
  locale: "en_IN",
  twitter: "@meetmypetsapp",
  // Real handle (meetmypets.app, with a dot) — NOT derived from the Twitter handle, which has no dot.
  instagram: "https://www.instagram.com/meetmypets.app/",
} as const;

// wa.me needs the number with no +, spaces or punctuation; `display` keeps the human-readable version for on-screen use.
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

// Hero-only wording. Separate from `cta` above, which the header and every SectionCta still share.
export const heroCta = {
  primary: isLaunched ? "Download for iOS & Android" : "Save Your Pet's Spot",
  primaryHref: "#waitlist",
  secondary: "Find Their Friends",
  secondaryHref: "#ecosystem",
} as const;

export const hero = {
  // Non-breaking spaces so a wrap never strands an arrow at the end of a line.
  badge: "Create → Discover → Match → Connect",
  // Split for the kinetic mask reveal — keep entries short, long lines wrap awkwardly inside the overflow mask at 375px.
  headlineLines: ["Your Pet's Social Life", "Starts Here."],
  headlinePlain: "Your Pet's Social Life Starts Here.",
  subhead:
    "Create your pet's profile, find a friend they might love, connect with their parents, and turn a simple match into a real-life friendship.",
} as const;

// Illustrative hero persona, not a real profile — same "Mochi" mascot as the verification toggle and species marquee.
export const heroPersona = {
  name: "Mochi",
  species: "Shiba Inu",
  age: "3 yrs",
  distance: "Within 1.2 km",
  bio: "Loves a slow sniff walk, bad at sharing tennis balls.",
  tags: ["Playdate", "Park regular", "Vaccinated"],
  photo: { src: "/pet-yorkshire-terrier.webp", alt: "Mochi" } satisfies PetPhoto,
} as const;

// The one stats moment on the page. None are user/download counts: surveyed is real research, species/breeds are verified against the production DB (see docs/admin/schema-notes.md).
export const statsBanner = [
  { value: 100, suffix: "+", label: "Pet Owners Surveyed" },
  { value: 6, suffix: "", label: "Species Supported" },
  { value: 34, suffix: "+", label: "Breeds Catalogued" },
  { value: 3, suffix: "", label: "Products, One Ecosystem" },
] as const;

/** `photo` is a stand-in image for the panel, not tied to any pet named in its copy. */
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
    title: "Find Their Match",
    body: "Find nearby pets that share their personality, interests, and social vibe.",
  },
  verification: {
    title: "Trust you can see",
    body: "Every badge tells a story. Look for signs that help you feel more confident about who your pet will meet.",
  },
  species: {
    title: "Every Pet Has a Place",
    body: "Playful pups, friendly cats, happy rabbits, chirpy birds, and more — every pet gets a place to be themselves, make friends, and belong.",
  },
  businesses: {
    title: "Everything Your Pet Needs, Nearby",
    body: "From grooming and healthcare to everyday pet needs, find trusted services, professionals, and places near you — all in one place.",
  },
} as const;

// Sample profiles for the multi-species marquee — illustrative, not real users. Entries without `photo` (bird/rabbit/reptile) fall back to the species icon.
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

// One photo per "How it works" step, order mirroring `howItWorks` below; `objectPosition` overrides `object-top` so the face stays inside the blob clip.
export const howItWorksPhotos: (PetPhoto & { objectPosition?: string })[] = [
  { src: "/pet-yorkshire-terrier.webp", alt: "A Yorkshire Terrier ready to be added to a profile" },
  { src: "/pet-corgi-puppy.webp",        alt: "A Corgi puppy discovered nearby" },
  { src: "/pet-cat-grey-shorthair.webp", alt: "A grey shorthair cat ready to meet", objectPosition: "top" },
  { src: "/pet-samoyed-puppy.webp",      alt: "A Samoyed heading out to a real-life meetup" },
];

export const howItWorks = [
  {
    step: "01",
    title: "Create Their Profile",
    body: "Create a profile for your pet with their photos, personality, interests, and more.",
  },
  {
    step: "02",
    title: "Find Their Match",
    body: "Find pets nearby that could be a great match for your pet and send a match request.",
  },
  {
    step: "03",
    title: "Match & Chat",
    body: "Once the other pet parent accepts, start chatting in the app and get to know each other.",
  },
  {
    step: "04",
    title: "Plan the Meetup",
    body: "Agree on a comfortable place and time, then turn the match into a real-life meetup.",
  },
] as const;

/** Sits above "What you get" — names the pain before the product answers it. */
export const problem = {
  eyebrow: "The problem",
  title: "Your pet wants friends. Finding them shouldn't be so hard.",
  body: "Finding the right pet nearby, connecting with their parents, and planning a meetup can be harder than it should be.",
  closing: "Your pet deserves an easier way to make friends.",
  cards: [
    {
      step: "01",
      title: "Hard to Find the Right Match",
      body: "Your pet needs more than a nearby pet. Finding one they may actually get along with is difficult.",
    },
    {
      step: "02",
      title: "Too Many Places to Search",
      body: "Pet parents rely on WhatsApp groups, social media, and word of mouth to find other pets.",
    },
    {
      step: "03",
      title: "Hard to Connect & Meet",
      body: "Even after finding a potential match, chatting with the pet parent and planning a local meetup takes extra effort.",
    },
  ],
} as const;

/** Answers `problem` directly below it — same three frictions, resolved. */
export const solution = {
  eyebrow: "The solution",
  title: "A simpler way for your pet to find their people.",
  body: "Meet pets nearby, find the right match, chat with their parents, and turn a connection into a real meetup.",
  closing: "From finding a match to making a new friend — it starts with your pet.",
  cards: [
    {
      step: "01",
      title: "Discover the Right Match",
      body: "Create your pet's profile and discover pets nearby who may be a good match for them.",
    },
    {
      step: "02",
      title: "Everything in One Place",
      body: "No more searching through groups and social apps. Find pet profiles, matches, and local connections in one place.",
    },
    {
      step: "03",
      title: "Chat First. Meet When Ready.",
      body: "Connect with the pet parent, chat in the app, and plan a local meetup when you're both comfortable.",
    },
  ],
} as const;

export const verificationSteps = [
  {
    step: "01",
    title: "Verified Pet Parent",
    body: "A verified profile helps you know there's a real pet parent behind the pet.",
  },
  {
    step: "02",
    title: "Vaccination Verified",
    body: "Vaccination details help verify your pet's profile and build greater trust when connecting with others.",
  },
  {
    step: "03",
    title: "Trust Badge",
    body: "A visible badge shows the profile's trust level, helping you feel more confident about who you connect with.",
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
  title: "Your Pet's Social Life Starts Here.",
  body: "Create your pet's profile, find pets they might click with, connect with their parents, and turn a simple match into a real-life friendship.",
  successTitle: "You are on the list",
  successBody: "We will reach out the moment MeetMyPets is ready. Nothing else, we promise.",
  consent:
    "By joining you agree we may contact you about the MeetMyPets launch. We do not sell or share your details.",
} as const;

// A cap on an offer, not a claim that 1,000 people already use the app. `remaining` is live from identity.accounts via apps/admin's one public route; on failure VipBadge shows `badge` with no number rather than a guessed one.
export const vipOffer = {
  badge: "First 1,000 get VIP access",
  perk: "Get in early, unlock founding-member perks, and give your pet a head start on their social life.",
  cap: 1_000,
} as const;

// Timed pop-up, once per visitor (localStorage-gated). Copy is shorter than the `waitlist` section on purpose — a modal has a much smaller attention budget.
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
      // Absolute, not an anchor — this one has to work from the blog pages too.
      { label: "Blog", href: "/blog/" },
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
      // Google Play's Data Safety form expects deletion instructions findable without signing in.
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
