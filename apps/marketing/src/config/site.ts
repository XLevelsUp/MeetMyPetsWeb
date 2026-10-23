// Every user-facing string. PRE-LAUNCH COPY RULE: no user count, rating or download figure stated as fact until `isLaunched` flips.

export const isLaunched = false;

// Stand-in photo for an illustrative entry — the animal may not match the stated breed, and is never a claim about a real pet.
type PetPhoto = { src: string; alt: string };

export const site = {
  name: "MeetMyPets",
  domain: "www.meetmypets.app",
  url: "https://www.meetmypets.app",
  email: "hello@meetmypets.app",
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
  x: "https://x.com/meetmypetsapp",
  // Real handle (meetmypets.app, with a dot) — NOT derived from the Twitter handle, which has no dot.
  instagram: "https://www.instagram.com/meetmypets.app/",
} as const;

// wa.me needs the number with no +, spaces or punctuation; `display` keeps the human-readable version for on-screen use.
export const whatsapp = {
  display: "+91 90470 55888",
  href: "https://wa.me/919047055888",
  message: "Hi! I'm curious about MeetMyPets 🐾",
} as const;

// The live Play listing. iOS has no build yet, so `ios` stays null and the UI says 'coming soon' rather than linking nowhere.
export const appStore = {
  android: "https://play.google.com/store/apps/details?id=com.xlu.meetmypets",
  ios: null,
} as const;


// Absolute, not bare anchors: these have to work from /about and /blog too, where no such section exists.
// Keep this to five or six — a seventh wrapped the desktop nav to two rows at every width.
export const nav = [
  { label: "About Us", href: "/about/" },
  { label: "Our Story", href: "/our-story/" },
  { label: "Our Team", href: "/team/" },
  { label: "Blog", href: "/blog/" },
  { label: "How it works", href: "/#how-it-works" },
] as const;

export const cta = {
  primary: "Download App",
  secondary: "Explore the Ecosystem",
  secondaryHref: "#ecosystem",
  // Anchors the install section, which replaced the waitlist form at the same spot.
  waitlistHref: appStore.android,
} as const;

// Hero-only wording. Separate from `cta` above, which the header and every SectionCta still share.
export const heroCta = {
  primary: "Install on Google Play",
  primaryHref: appStore.android,
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
    a: "MeetMyPets is live on Google Play — install it today and claim one of the first 1,000 VIP spots. The iOS build is in development; we will announce it the moment it lands.",
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
  perk: "Install now to lock in founding-member perks and give your pet a head start on their social life.",
  cap: 1_000,
} as const;

// Timed pop-up, once per visitor (localStorage-gated). Copy is shorter than the `waitlist` section on purpose — a modal has a much smaller attention budget.
export const waitlistPopup = {
  eyebrow: "Before you go",
  title: "Don't miss the first tail wag",
  body: "MeetMyPets is almost ready. Join the waitlist and we'll let you know the moment doors open — nothing else, ever.",
} as const;

/**
 * Founder story for /our-story.
 *
 * Names real people (Pranesh, his aunt Poorni, the cat JD), so copy changes
 * here need their sign-off. Structured as story beats rather than uniform
 * sections: the page gives each beat a different weight, and `openingItems`,
 * `belief` and `turn` are the emotional peaks it builds toward.
 */
export const ourStory = {
  eyebrow: "Our story",
  title: "Built for Every Person Who's Ever Loved an Animal.",
  intro:
    "It began with a house full of animals, a cat who needed a friend, and one simple question.",

  opening: {
    title: "Where a Lifelong Love for Animals Began",
    lede: "Not every founder story starts in a boardroom.",
    body: "Pranesh S, the founder of MeetMyPets, grew up in a home filled with animals.",
    // Rendered as a stagger, with the count animated — the detail that makes the childhood real.
    items: ["bunnies", "chickens", "fishes", "snails"] as const,
    countLabel: "lovebirds in a cage at the front of the house",
    count: 30,
    closing: "For him, animals were never just animals. They were part of everyday life.",
    photo: {
      brief:
        "Pranesh as a child with the family's animals — or the lovebird cage at the front of the house.",
      alt: "The founder's childhood home, filled with animals",
    },
  },

  belief: {
    quote: "Any animal you love is your pet.",
    note: "That childhood shaped a belief that still guides MeetMyPets today.",
  },

  problem: {
    eyebrow: "The problem",
    title: "The Problem That Started It All",
    lede: "One cat. One search. A problem worth solving.",
    body: [
      "Pranesh's aunt, Poorni, has a Persian punchface cat named JD. When she wanted to find JD a suitable mate, the process turned out to be more difficult than expected.",
      "Finding a compatible cat nearby. Connecting with a trusted owner. Checking reliable health information. Every step was slow, scattered and uncertain.",
    ],
    emphasis: "There was no clear place to find everything she needed.",
    closing:
      "That experience revealed a bigger problem: pet owners needed a better way to discover, connect and build trust with one another.",
    photo: {
      src: "/our-story/jd-studio.webp",
      caption: "JD — the cat this whole company started with.",
      alt: "JD, a white and grey Persian punchface cat, wearing a Gryffindor robe and scarf",
    },
  },

  turn: {
    eyebrow: "The turn",
    question: "Why doesn't a social community just for pets exist?",
    body: [
      "One night, scrolling through social media, Pranesh's feed filled with cats, dogs, birds and fish — animals bringing people together, everywhere he looked.",
      "He imagined a place where people could discover nearby pets, share experiences, find companions and connect with the professionals who care for them.",
    ],
    closing: "That idea became MeetMyPets.",
  },

  pillars: {
    eyebrow: "The vision",
    title: "More Than an App. A Community.",
    lede: "Built around connection. Designed with trust.",
    intro:
      "A shared online home for pet parents, animal enthusiasts and pet-care professionals, built on three things:",
    items: [
      {
        title: "Community",
        body: "A place to share pet moments and connect with fellow animal lovers.",
      },
      {
        title: "Discovery",
        body: "A way to find compatible pets and explore the local pet community.",
      },
      {
        title: "Trust",
        body: "A verification system designed to help owners make more informed connections.",
      },
    ],
    // Mirrors the verification section — a badge reflects current documents, never a permanent claim.
    note: "Our graduated verification approach reflects the status of submitted documentation, including vaccination validity, rather than relying on a permanent badge that may become outdated. Meaningful connections begin when people have better information.",
  },

  everyPet: {
    eyebrow: "Who it is for",
    title: "Every Pet. Every Person.",
    lede: "Because love for animals has no boundaries.",
    // `glyph` maps to SpeciesIcon; anything unmapped falls back to a paw.
    species: [
      { label: "Dogs", glyph: "dog" },
      { label: "Cats", glyph: "cat" },
      { label: "Birds", glyph: "bird" },
      { label: "Rabbits", glyph: "rabbit" },
      { label: "Reptiles", glyph: "reptile" },
      { label: "Fish", glyph: "fish" },
      { label: "Snails", glyph: "snail" },
      { label: "and more", glyph: "paw" },
    ],
    notJust: "Not just cats and dogs.",
    belong: {
      title: "And you don't have to own a pet to belong.",
      body: "Pet parent, animal enthusiast, or someone who simply loves being around animals — there is room for you here.",
    },
    closing:
      "The animals that filled Pranesh's childhood are the same reason MeetMyPets believes every species deserves a place.",
  },

  journey: {
    eyebrow: "What comes next",
    title: "Our Journey Starts Here",
    lede: "One community. Countless connections.",
    body: "We are starting with the essential foundations of pet profiles, local discovery and trust, with a broader ecosystem growing from that community.",
    vision: "A world where every pet has a community, and every community has trust.",
    signature: "Every Pet Belongs.",
  },

  cta: {
    title: "Be Part of Our Story",
    lede: "Your pet's next connection could start here.",
    body: "Join the MeetMyPets community and be part of a more connected world for animals and the people who love them.",
    label: "Join the MeetMyPets Community",
    href: appStore.android,
  },
} as const;

// Content for /about. `pets` are cut-outs in public/about/, one per value, sitting on each card's top edge.
export const about = {
  eyebrow: "About MeetMyPets",
  title: "Every Pet Deserves a Connection.",
  intro:
    "MeetMyPets is a pet social platform built to bring pets and their people closer. We help pet parents discover compatible companions, connect with fellow pet lovers, and explore a world of new friendships.",
  closing: "Because life is better with a little more friendship and a lot more paws.",

  mission: {
    label: "Our Mission",
    body: "Our mission is to bring pets and their people closer through meaningful connections and compatible companions. We make it easier for every pet to discover new friends, share joyful experiences, and explore the world together. Through a welcoming community, we aim to make every pet's social life happier.",
  },

  vision: {
    label: "Our Vision",
    body: "To build the world's largest social ecosystem for pets, where every pet can discover companions and meaningful connections, creating a happier, more connected world.",
    // What the vision means in practice — the statement alone was abstract.
    pillars: [
      { label: "Every species", body: "Not just cats and dogs — a place for every companion animal." },
      { label: "Every neighbourhood", body: "Local discovery first, so a connection can become a real meetup." },
      { label: "Built on trust", body: "Verified profiles and visible trust signals before anyone meets." },
    ],
  },

  values: {
    // Rendered two-tone: the first word plain, the second in brand colour.
    titleLead: "Our",
    titleAccent: "Values",
    items: [
      {
        id: "connection",
        title: "Connection",
        body: "We believe every pet deserves the chance to make friends, build bonds, and create joyful memories.",
        pet: { src: "/about/connection.webp", alt: "A corgi puppy sitting upright" },
      },
      {
        id: "inclusivity",
        title: "Inclusivity",
        body: "We welcome every pet, pet parent, and animal lover, celebrating the unique personality of each one.",
        pet: { src: "/about/inclusivity.webp", alt: "A hamster standing on its hind legs" },
      },
      {
        id: "trust",
        title: "Trust & Safety",
        body: "We strive to create a safe, respectful, and reliable space where pet communities can grow with confidence.",
        pet: { src: "/about/trust.webp", alt: "A Samoyed puppy sitting" },
      },
      {
        id: "innovation",
        title: "Innovation",
        body: "We use thoughtful technology to make discovering compatible companions and connecting with others easier.",
        pet: { src: "/about/innovation.webp", alt: "A Yorkshire Terrier looking ahead" },
      },
      {
        id: "community",
        title: "Community",
        body: "We bring pet lovers together to share experiences, support one another, and build a more connected world for pets.",
        pet: { src: "/about/community.webp", alt: "A ginger longhaired cat walking" },
      },
    ],
  },

  cta: {
    title: "Be Part of the Pack",
    lede: "Your pet's next friendship could start here.",
    body: "Join the MeetMyPets community and be part of what's next.",
    label: "Join the Pack",
    href: appStore.android,
  },
} as const;

// Three tiers, deliberately ordered: founders, team, then the pets who outrank both.
export const team = {
  eyebrow: "Our Team",
  title: "The People Behind the Paws.",
  intro:
    "A small team building the place we wished existed for our own pets — and the three who supervise us while we do it.",

  groupPhoto: {
    alt: "The MeetMyPets team together",
    brief: "The whole team in one shot — relaxed, not a corporate line-up.",
  },

  founders: {
    label: "Leadership",
    members: [
      { name: "Pranesh S", role: "CEO & Founder", quote: "Big vision. Better connections." },
      {
        name: "Prahal Nath K",
        role: "CTO & Senior Software Engineer",
        quote: "Turning code into connections.",
      },
      { name: "Vishnu Ram K", role: "CFO & App Designer", quote: "Thoughtful design. Smarter growth." },
    ],
  },

  people: {
    label: "The Team",
    members: [
      {
        name: "Arsath Roshan T S",
        role: "Full Stack Developer",
        quote: "Building connections, one feature at a time.",
      },
      { name: "Logeshwaran S", role: "AI Engineer", quote: "Making pet discovery smarter." },
      {
        name: "Mahalaxmi N",
        role: "Associate Software Engineer",
        quote: "Building the details that connect us.",
      },
      {
        name: "Gayathri K",
        role: "Business Development Manager",
        quote: "Growing relationships and possibilities.",
      },
      {
        name: "Nithyasri V",
        role: "Senior Marketing Executive",
        quote: "Creative ideas. Meaningful experiences.",
      },
      {
        name: "Vinoth Kumar S J",
        role: "Associate Marketing Executive",
        quote: "Stories that bring pet lovers together.",
      },
    ],
  },

  pets: {
    label: "And The Real Bosses",
    lede: "Every decision gets their approval. Eventually.",
    members: [
      {
        name: "Bailey",
        role: "Chief Happiness Officer",
        abbr: "CHO",
        body: "Professional tail-wagger, full-time smile creator, and expert in turning ordinary moments into happy memories.",
        photo: { src: "/our-story/bailey-studio.webp", alt: "Bailey, a dog" },
      },
      {
        name: "JD",
        role: "Chief Nap Officer",
        abbr: "CNO",
        body: "Nap first, think later. Keeping the team relaxed, one cozy snooze and one purr at a time.",
        photo: { src: "/our-story/jd-studio.webp", alt: "JD, a cat" },
      },
      {
        name: "Leo",
        role: "Chief Play Officer",
        abbr: "CPO",
        body: "Head of fun, master of mischief, and always ready to turn a quiet day into a pawsome adventure.",
        photo: { src: "/our-story/leo-studio.webp", alt: "Leo, a cat" },
      },
    ],
  },

  cta: {
    title: "Want To Join Us?",
    body: "We are always glad to hear from people who care about pets as much as we do.",
    label: "Say Hello",
    href: "mailto:hello@meetmypets.app",
  },
} as const;

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Ecosystem", href: "/#ecosystem" },
      { label: "Verification", href: "/#verification" },
      { label: "How it works", href: "/#how-it-works" },
      // Absolute, not an anchor — this one has to work from the blog pages too.
      { label: "Blog", href: "/blog/" },
      { label: "Our Story", href: "/our-story/" },
      { label: "About Us", href: "/about/" },
      { label: "Our Team", href: "/team/" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "For pet parents", href: "/#ecosystem" },
      { label: "For pet lovers", href: "/#ecosystem" },
      { label: "For businesses", href: "/#businesses" },
      { label: "Download App", href: appStore.android },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy/" },
      { label: "Terms of service", href: "/terms/" },
      // Google Play's Data Safety form expects deletion instructions findable without signing in.
      { label: "Delete your account", href: "/delete-account/" },
      // Google Play's child safety (CSAE) standards declaration needs a public URL.
      { label: "Child safety", href: "/csae-policy/" },
      { label: "Data protection", href: "/privacy/" },
      { label: "Contact", href: "mailto:hello@meetmypets.app" },
    ],
  },
] as const;

/**
 * Blog index copy. The articles themselves are CMS content (public.blog_posts),
 * written at admin.meetmypets.app/blogs and read by src/lib/blog.ts.
 */
export const blogMeta = {
  title: "Pet Care & Community Blog",
  description:
    "Guides on pet socialisation, playdates, profiles and local pet communities — from the team building MeetMyPets.",
  /** The default byline. Published as the organisation in JSON-LD, any other name as a person. */
  author: "MeetMyPets Team",
} as const;

export const footer = {
  blurb:
    "A multi-species pet ecosystem — community, discovery and verified professionals in one app.",
  compliance:
    "Personal data is handled in accordance with India's Digital Personal Data Protection Act, 2023.",
  note: "Available now on Google Play. iOS coming soon.",
} as const;
