// Blog content as data — one template renders every post. Add a post by adding an entry here.

/** A paragraph, heading, bullet list or inline CTA inside a post body. */
export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "cta"; label: string; href: string };

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  /** Card copy and the meta description — keep under ~160 characters. */
  excerpt: string;
  /** ISO date. Omitted until the team sets one; the template and JSON-LD both skip it when absent. */
  published?: string;
  hero: { src: string; alt: string; caption?: string };
  /** Not shown on the page — feeds the `keywords` field in BlogPosting JSON-LD. */
  tags: string[];
  body: BlogBlock[];
  /** Rendered open, and emitted as FAQPage structured data. */
  faq: { q: string; a: string }[];
};

export const blogMeta = {
  title: "Pet Care & Community Blog",
  description:
    "Guides on pet socialisation, playdates, profiles and local pet communities — from the team building MeetMyPets.",
  author: "MeetMyPets Team",
} as const;

const WAITLIST = "/#waitlist";
const ECOSYSTEM = "/#ecosystem";

export const blogPosts: BlogPost[] = [
  {
    slug: "pet-social-networks-india",
    title: "How Pet Social Networks Are Changing the Way Pet Parents Find Friends in India",
    category: "Pet Social Life",
    excerpt:
      "Pet parents rely on WhatsApp groups, Instagram and word of mouth to find pet friends. A dedicated pet social network can make that simpler.",
    hero: {
      src: "/blog/pet-social-networks-india.webp",
      alt: "Pet parents and their dogs meeting together at an outdoor park in India",
      caption: "Finding the right pet friends nearby does not have to be left to chance.",
    },
    tags: ["Pet Social Life", "Pet Community", "Pet Networking"],
    body: [
      {
        type: "p",
        text: "Having a pet is not only about feeding, walking, and caring for them. Pets also need companionship, play, and opportunities to interact with other pets.",
      },
      {
        type: "p",
        text: "But finding the right pet friends nearby is not always easy. Pet parents often depend on WhatsApp groups, Instagram pages, local contacts, or word of mouth to discover other pets. This is where a pet social network can make finding and connecting with other pet parents simpler.",
      },
      { type: "h2", text: "Why Pet Parents Need a Better Way to Connect" },
      {
        type: "p",
        text: "Imagine having a friendly dog that loves playing with other dogs, but not knowing which pets nearby have a similar personality.",
      },
      {
        type: "p",
        text: "You may search for a dog walking group in Chennai, ask friends about a playdate, or look through local social media communities. These options can help, but the information is often scattered.",
      },
      {
        type: "p",
        text: "A dedicated pet networking app brings pet profiles and pet parents together in one place. Instead of searching through multiple groups, pet parents can discover pets based on location, interests, and compatibility.",
      },
      { type: "h2", text: "From Online Profiles to Real Playdates" },
      {
        type: "p",
        text: "A pet profile can tell you more than just a pet's name and breed. It can show personality, interests, and other useful details that help pet parents understand whether two pets could get along.",
      },
      {
        type: "p",
        text: "For example, someone looking for a dog playdate in Chennai can discover nearby pets and connect with their parents before planning a meetup.",
      },
      {
        type: "p",
        text: "The same idea can work for younger pets. A puppy play date app in Tamil Nadu can help puppy parents discover other local puppies and potentially create opportunities for safe socialisation and play.",
      },
      { type: "h2", text: "Building a Local Pet Community" },
      { type: "p", text: "A strong pet community is not limited to individual playdates." },
      {
        type: "p",
        text: "Pet parents may want to discover local activities, meet other owners, share experiences, or find pet events in Tamil Nadu. A dedicated platform can bring these conversations and connections closer to the people who actually live nearby.",
      },
      {
        type: "p",
        text: "While some people may prefer a traditional pet community forum in India, others may want a more interactive experience built around pet profiles, discovery, matching, and direct conversations.",
      },
      {
        type: "p",
        text: "The goal is simple: make it easier for pets and their parents to find their community.",
      },
      { type: "h2", text: "More Than Just a Social App" },
      {
        type: "p",
        text: "A useful pet platform can eventually bring several aspects of pet life together.",
      },
      {
        type: "p",
        text: "From discovering a dog walking group in Chennai to finding local pet activities, keeping important information organised, or connecting with nearby pet parents, digital tools can make everyday pet ownership more connected.",
      },
      {
        type: "p",
        text: "Features such as a pet vaccination tracker in Tamil Nadu could also help pet parents keep important vaccination information organised, while social features can help them build meaningful connections.",
      },
      { type: "h2", text: "Finding the Right Pet App for Your Needs" },
      {
        type: "p",
        text: "There is no single best pet app in India for every pet parent. The right platform depends on what you want to do.",
      },
      {
        type: "p",
        text: "If your goal is simply to track pet information, a specialised tool may be enough. If you want to discover nearby pets, meet other pet parents, and build local connections, a pet parents social app in India can offer a different kind of experience.",
      },
      { type: "p", text: "MeetMyPets is being built around this social side of pet ownership." },
      {
        type: "p",
        text: "Create a pet profile, discover compatible pets nearby, connect with their parents, and start a conversation before planning your next meetup.",
      },
      { type: "cta", label: "Explore MeetMyPets", href: ECOSYSTEM },
      {
        type: "p",
        text: "Because your pet's social life can start with a simple connection.",
      },
    ],
    faq: [],
  },

  {
    slug: "why-pet-socialisation-matters",
    title: "Why Socialisation Matters for Your Pet's Everyday Life",
    category: "Pet Social Life",
    excerpt:
      "Social experiences shape everyday pet life as much as food and exercise. Here is what pet socialisation really means, and how to approach it.",
    hero: {
      src: "/blog/why-pet-socialisation-matters.webp",
      alt: "Pet parents and dogs socialising together at an outdoor pet meetup",
      caption: "A healthy pet social life starts with positive connections.",
    },
    tags: ["Pet Social Life", "Socialisation", "Pet Community"],
    body: [
      {
        type: "p",
        text: "A pet's world can become much bigger when they have opportunities to meet, interact, and spend time with other pets. While food, exercise, and healthcare are essential parts of responsible pet ownership, social experiences can also play an important role in everyday pet life.",
      },
      {
        type: "p",
        text: "For many pet parents, however, finding suitable pets nearby is not always simple.",
      },
      {
        type: "p",
        text: "You might meet another dog during an evening walk, discover a local pet group, or hear about a meetup through friends. But these connections are often unplanned and scattered across different platforms.",
      },
      { type: "p", text: "That is where the idea of a pet social network becomes useful." },
      { type: "h2", text: "What Does Pet Socialisation Mean?" },
      {
        type: "p",
        text: "Pet socialisation is more than simply putting two animals in the same space. It involves helping pets become comfortable around different animals, people, environments, sounds, and experiences in appropriate and positive ways.",
      },
      {
        type: "p",
        text: "Every pet is different. Some dogs may immediately enjoy meeting new friends, while others may need more time and space. Cats and other pets can have completely different social preferences.",
      },
      {
        type: "p",
        text: "Understanding your pet's personality is therefore an important first step.",
      },
      { type: "h2", text: "Finding Pets With Similar Social Interests" },
      {
        type: "p",
        text: "Imagine being able to create a profile for your pet that describes their personality, interests, and preferences.",
      },
      {
        type: "p",
        text: "Instead of simply searching for “dogs near me,” you could look for pets that may have similar interests or social habits.",
      },
      {
        type: "p",
        text: "A pet parents social app India can make this type of discovery more organised by bringing pet profiles and pet parents into the same community.",
      },
      {
        type: "p",
        text: "MeetMyPets is designed around this idea: helping pet parents discover other pets, connect with their parents, and explore potential friendships.",
      },
      { type: "cta", label: "Explore MeetMyPets", href: ECOSYSTEM },
      { type: "h2", text: "From Digital Connections to Real Experiences" },
      { type: "p", text: "A digital connection is only the beginning." },
      {
        type: "p",
        text: "Once two pet parents have connected and had a conversation, they can decide whether a meetup makes sense for their pets. A short walk, a visit to a suitable pet-friendly space, or a planned play session can turn an online discovery into an offline experience.",
      },
      {
        type: "p",
        text: "For example, someone searching for a dog playdate Chennai may want more than a list of random profiles. They may want to understand the pet, speak with the owner, and decide whether the two dogs could be comfortable together.",
      },
      { type: "p", text: "That human connection matters." },
      { type: "h2", text: "Building a More Connected Pet Community" },
      {
        type: "p",
        text: "A strong pet community is built through small connections: two dogs meeting at a park, two pet parents sharing experiences, or a group discovering a new pet-friendly activity.",
      },
      {
        type: "p",
        text: "The goal isn't to make every pet social with every other pet. It is to make it easier for pet parents to discover possibilities and make informed choices.",
      },
      {
        type: "p",
        text: "If you want to be part of an early community built around pet connections, you can join the MeetMyPets waitlist.",
      },
      { type: "cta", label: "Join the MeetMyPets Waitlist", href: WAITLIST },
      {
        type: "p",
        text: "Your pet's social life doesn't have to begin with a chance encounter. Sometimes, it can begin with finding the right community.",
      },
    ],
    faq: [
      {
        q: "Why is socialisation important for pets?",
        a: "Positive social experiences can help pets become more comfortable with different animals, people, and environments. The approach should always consider the individual pet's temperament.",
      },
      {
        q: "How can I find other pets for my pet?",
        a: "Pet parents can explore local groups, community events, walking groups, and pet-focused social platforms where available.",
      },
      {
        q: "Does every pet need to socialise with other pets?",
        a: "Not necessarily. Pets have different personalities and social preferences. Pet interactions should be appropriate, gradual, and comfortable for the animals involved.",
      },
    ],
  },

  {
    slug: "find-the-right-playmate-for-your-pet",
    title: "How to Find the Right Playmate for Your Pet",
    category: "Pet Matching & Playdates",
    excerpt:
      "Finding another pet is easy. Finding the right one is harder. Age, energy, size and personality all shape whether a meetup works.",
    hero: {
      src: "/blog/find-the-right-playmate-for-your-pet.webp",
      alt: "Two dogs meeting during a pet playdate with their owners",
      caption: "The right playdate starts with finding a compatible companion.",
    },
    tags: ["Pet Matching & Playdates", "Playdates", "Pet Compatibility"],
    body: [
      {
        type: "p",
        text: "Finding another pet is easy. Finding the right pet companion can be much harder.",
      },
      {
        type: "p",
        text: "A dog may live only a few streets away, but that does not automatically mean the two dogs will enjoy spending time together. Age, size, energy levels, personality, and social preferences can all influence whether a meetup is comfortable and enjoyable.",
      },
      { type: "p", text: "This is why pet matching can be useful." },
      { type: "h2", text: "What Makes Two Pets Compatible?" },
      { type: "p", text: "Compatibility doesn't necessarily mean two pets have to be identical." },
      {
        type: "p",
        text: "One energetic puppy may enjoy another playful puppy. A calm adult dog may prefer a quieter companion. Some pets enjoy running and chasing, while others are happier sitting beside another pet.",
      },
      { type: "p", text: "When looking for a playmate, pet parents can consider:" },
      {
        type: "ul",
        items: [
          "Age and life stage",
          "Energy level",
          "Size and activity preferences",
          "Personality",
          "Social behaviour",
          "Favourite activities",
          "Location",
        ],
      },
      {
        type: "p",
        text: "These details can help pet parents have better conversations before arranging a meetup.",
      },
      { type: "h2", text: "Moving Beyond Random Pet Meetups" },
      {
        type: "p",
        text: "Traditional methods of finding pet friends often depend on coincidence.",
      },
      {
        type: "p",
        text: "You may find a dog walking group Chennai, meet another pet at the park, or ask people in your neighbourhood. These can be useful, but they don't always make it easy to understand whether another pet is a good potential match.",
      },
      {
        type: "p",
        text: "A pet matching app can create a more structured way to discover pets based on information in their profiles.",
      },
      {
        type: "p",
        text: "MeetMyPets brings this concept together by allowing pet parents to create profiles, discover other pets, send match requests, and connect before planning a meetup.",
      },
      { type: "cta", label: "Discover MeetMyPets", href: ECOSYSTEM },
      { type: "h2", text: "A Playdate Starts Before the Meetup" },
      {
        type: "p",
        text: "The first conversation between pet parents can be just as important as the meetup itself.",
      },
      {
        type: "p",
        text: "Before meeting, owners can discuss where the meetup will happen, how long it will last, and what their pets are comfortable with.",
      },
      {
        type: "p",
        text: "For puppies, this can be particularly useful. Someone searching for a puppy play date app Tamil Nadu may be looking for opportunities for their puppy to meet other young pets in an appropriate setting.",
      },
      {
        type: "p",
        text: "The goal isn't to force a friendship. It is to create an opportunity for two pets to meet safely and comfortably.",
      },
      { type: "h2", text: "Make the First Meetup Simple" },
      { type: "p", text: "A first meetup doesn't need to be complicated." },
      {
        type: "p",
        text: "A short walk or a quiet outdoor meeting can be enough. Give the pets space to observe each other, watch their behaviour, and avoid rushing the interaction.",
      },
      {
        type: "p",
        text: "If the pets are comfortable, future meetups can naturally become longer or more regular.",
      },
      {
        type: "p",
        text: "MeetMyPets is being built around this simple idea: helping pet parents move from discovery to conversation and, when appropriate, from conversation to real-world meetups.",
      },
      { type: "cta", label: "Join the MeetMyPets Waitlist", href: WAITLIST },
      {
        type: "p",
        text: "The right pet friend may not be the closest pet you can find. It may be the one whose personality and interests fit your pet's social life.",
      },
    ],
    faq: [
      {
        q: "What should I consider before arranging a pet playdate?",
        a: "Consider personality, age, size, energy level, social behaviour, and any relevant health or vaccination information.",
      },
      {
        q: "Should the first playdate be long?",
        a: "Not necessarily. A short, controlled introduction can be a better starting point than a long meetup.",
      },
      {
        q: "Can pets with different personalities become friends?",
        a: "Yes. Pets do not need identical personalities to interact positively. Their individual comfort and behaviour are more important than simply matching characteristics.",
      },
    ],
  },

  {
    slug: "what-to-include-in-a-pet-profile",
    title: "What Should You Include in a Pet Profile?",
    category: "Pet Profiles & Trust",
    excerpt:
      "A photo and a name rarely tell the whole story. Here is what makes a pet profile genuinely useful to other pet parents.",
    hero: {
      src: "/blog/what-to-include-in-a-pet-profile.webp",
      alt: "Pet parent creating an online profile for a dog on a smartphone",
      caption: "A useful pet profile helps pet parents know more before they connect.",
    },
    tags: ["Pet Profiles & Trust", "Pet Profiles", "Verification"],
    body: [
      {
        type: "p",
        text: "When people meet a new pet online, a photo and name can be a good starting point. But they rarely tell the whole story.",
      },
      {
        type: "p",
        text: "Is the pet playful or calm? Do they enjoy meeting other animals? Are they comfortable around children? What activities do they enjoy?",
      },
      {
        type: "p",
        text: "A useful pet profile can help answer some of these questions before pet parents decide to connect.",
      },
      { type: "h2", text: "Why Pet Profiles Matter" },
      {
        type: "p",
        text: "A pet profile is more than an online identity. It can give other pet parents useful context about the pet behind the profile.",
      },
      { type: "p", text: "Depending on the platform, a profile could include information such as:" },
      {
        type: "ul",
        items: [
          "Pet name",
          "Age",
          "Breed or type",
          "Personality",
          "Interests",
          "Favourite activities",
          "Location",
          "Relevant care information",
          "Social preferences",
        ],
      },
      {
        type: "p",
        text: "The more useful the information, the easier it can be for pet parents to decide whether they want to start a conversation.",
      },
      { type: "h2", text: "Building Trust Between Pet Parents" },
      { type: "p", text: "Connecting with a stranger online requires some level of trust." },
      {
        type: "p",
        text: "This is especially true when the purpose of the connection is eventually to arrange an offline meetup.",
      },
      {
        type: "p",
        text: "A pet networking app can support this process by giving pet parents more context before they connect. Verification, profile information, and visible trust indicators can help users understand more about the person and pet behind a profile.",
      },
      {
        type: "p",
        text: "Trust does not mean assuming someone is safe simply because they have a profile. Pet parents should still communicate, ask questions, and make sensible decisions before meeting.",
      },
      { type: "h2", text: "Why Verification Can Be Useful" },
      { type: "p", text: "Verification can provide an additional layer of information." },
      {
        type: "p",
        text: "For example, a platform may use verification to confirm certain details about a pet or pet parent. If vaccination information is included, it can also help users understand whether relevant records have been provided.",
      },
      {
        type: "p",
        text: "This is different from treating a digital badge as a guarantee. Verification should provide useful information, not replace responsible judgement.",
      },
      {
        type: "p",
        text: "A future-facing pet platform can therefore combine pet profiles, verification, and trust indicators to make online discovery more transparent.",
      },
      { type: "h2", text: "Profiles Can Help With Better Matches" },
      { type: "p", text: "Good profiles are also useful for matching." },
      {
        type: "p",
        text: "If one pet is highly energetic while another prefers quiet walks, their profiles may reveal that difference before the owners arrange a meetup.",
      },
      { type: "p", text: "This can save time and make conversations more relevant." },
      {
        type: "p",
        text: "MeetMyPets is being built to help pet parents create pet profiles, discover compatible pets, and connect before deciding whether to meet.",
      },
      { type: "cta", label: "Learn About MeetMyPets", href: ECOSYSTEM },
      { type: "h2", text: "Start With Information, Then Build the Connection" },
      {
        type: "p",
        text: "A profile cannot tell you everything about a pet. Behaviour can change depending on the environment and situation.",
      },
      { type: "p", text: "But a well-created profile gives pet parents a better starting point." },
      {
        type: "p",
        text: "As pet communities become more connected, useful profiles and thoughtful conversations can help turn unfamiliar faces into trusted connections.",
      },
      {
        type: "p",
        text: "If you'd like to follow the development of MeetMyPets and be part of the early community, you can join the waitlist.",
      },
      { type: "cta", label: "Join the MeetMyPets Waitlist", href: WAITLIST },
    ],
    faq: [
      {
        q: "What information should a pet profile include?",
        a: "Useful information includes the pet's age, personality, interests, activities, location, and relevant care or social details.",
      },
      {
        q: "Does a verified profile guarantee a safe meetup?",
        a: "No. Verification can provide additional information, but pet parents should still communicate and use their own judgment before meeting.",
      },
      {
        q: "Why are pet profiles useful for matching?",
        a: "Profiles give pet parents information that can help them identify pets with potentially compatible personalities, interests, and activity levels.",
      },
    ],
  },

  {
    slug: "online-pet-communities-real-world-adventures",
    title: "From Online Pet Communities to Real-World Adventures",
    category: "Local Pet Life & Activities",
    excerpt:
      "Pet ownership happens locally. Here is how online discovery can turn into walks, meetups and a real neighbourhood pet community.",
    hero: {
      src: "/blog/online-pet-communities-real-world-adventures.webp",
      alt: "Pet parents and dogs enjoying a local outdoor pet meetup",
      caption: "Online connections can become real-world pet experiences.",
    },
    tags: ["Local Pet Life & Activities", "Pet Events", "Local Community"],
    body: [
      { type: "p", text: "Pet ownership often happens locally." },
      {
        type: "p",
        text: "Your favourite walking route is nearby. Your pet's regular park is nearby. The groomer, vet, pet store, and other pet-friendly places you visit are part of your local routine.",
      },
      {
        type: "p",
        text: "So why should discovering other pets and pet activities happen only through scattered online groups?",
      },
      {
        type: "p",
        text: "A connected pet community can help bring online discovery closer to everyday pet life.",
      },
      { type: "h2", text: "Discovering What's Happening Around You" },
      { type: "p", text: "Pet parents are often looking for simple activities." },
      {
        type: "p",
        text: "It could be a morning walk, a weekend meetup, a puppy play session, or a local pet event. Someone may even be searching for pet events in Tamil Nadu or looking for other owners who regularly walk their dogs in the same area.",
      },
      {
        type: "p",
        text: "The challenge is discovering these opportunities at the right time and connecting with genuinely interested people.",
      },
      { type: "h2", text: "Turning Pet Connections Into Activities" },
      { type: "p", text: "A social platform can make the first step easier." },
      {
        type: "p",
        text: "Instead of simply reading a post about an event, pet parents could discover other pets, connect with their owners, and potentially attend an activity together.",
      },
      {
        type: "p",
        text: "For example, two pet parents who discover that their dogs enjoy similar outdoor activities might decide to meet for a walk.",
      },
      {
        type: "p",
        text: "This creates a connection between the digital and physical sides of pet life.",
      },
      { type: "h2", text: "Local Communities Can Start Small" },
      { type: "p", text: "A local pet community doesn't need hundreds of members to be useful." },
      {
        type: "p",
        text: "It could begin with a few pet parents in one neighbourhood who want to walk together.",
      },
      {
        type: "p",
        text: "Over time, those connections can grow into regular meetups, walking groups, playdates, or community activities.",
      },
      {
        type: "p",
        text: "This is where a dog walking group Chennai, for example, can become more than a group chat. With the right connections, it can become a regular part of the participating pets' routines.",
      },
      { type: "h2", text: "More Than Just Socialising" },
      { type: "p", text: "Local pet communities can also help people discover useful experiences." },
      {
        type: "p",
        text: "Pet parents can exchange recommendations, discover pet-friendly locations, learn about upcoming activities, and meet people who understand the everyday realities of living with pets.",
      },
      {
        type: "p",
        text: "A pet social network can therefore become a starting point for discovering the wider pet ecosystem around you.",
      },
      {
        type: "p",
        text: "MeetMyPets is being built around connecting pets and their parents so that online discovery can lead to meaningful conversations and, where appropriate, real-world experiences.",
      },
      { type: "cta", label: "Discover the MeetMyPets Community", href: ECOSYSTEM },
      { type: "h2", text: "Your Local Pet Community Starts With a Connection" },
      { type: "p", text: "You don't need to wait for a large event to meet other pet parents." },
      {
        type: "p",
        text: "A single conversation can lead to a walk. A walk can lead to a friendship. A few friendships can eventually create a local pet community.",
      },
      {
        type: "p",
        text: "If you're interested in being part of the early MeetMyPets community, you can join the waitlist and stay connected as the platform develops.",
      },
      { type: "cta", label: "Join the MeetMyPets Waitlist", href: WAITLIST },
      {
        type: "p",
        text: "Because your pet's world isn't limited to your home. There is a whole local community waiting to be discovered.",
      },
    ],
    faq: [
      {
        q: "What are some local activities pet parents can do together?",
        a: "Pet parents can organise walks, playdates, outdoor meetups, training activities, and visits to suitable pet-friendly places.",
      },
      {
        q: "How can I find other pet parents near me?",
        a: "Local pet groups, community events, walking groups, and pet-focused social platforms can help you discover other pet parents.",
      },
      {
        q: "Can online pet communities lead to offline friendships?",
        a: "Yes. Online platforms can make it easier to discover and communicate with other pet parents. Any offline meetup should be planned thoughtfully with the pets' comfort and safety in mind.",
      },
    ],
  },
];

/** Slug for a category — "Pet Profiles & Trust" -> "pet-profiles-trust". */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The four categories, in the order the source document lists them. */
export const categories = [
  "Pet Social Life",
  "Pet Matching & Playdates",
  "Pet Profiles & Trust",
  "Local Pet Life & Activities",
] as const;

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/** ~200 words per minute, floored at 1. Shown in the sidebar in place of a date. */
export function readTime(post: BlogPost): number {
  const words = post.body.reduce((n, b) => {
    if (b.type === "ul") return n + b.items.join(" ").split(/\s+/).length;
    if (b.type === "cta") return n;
    return n + b.text.split(/\s+/).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}
