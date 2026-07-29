/**
 * Legal document content — single source of truth for /privacy and /terms.
 *
 * The table of contents, the scroll-spy and the JSON-LD all derive from these
 * arrays, so the navigation can never drift from the rendered document.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS DRAFTED CONTENT, NOT LEGAL ADVICE.
 *
 * It was written from the product architecture and must be reviewed by
 * qualified Indian counsel before deployment. A privacy policy is a binding
 * statement of what the business actually does with personal data; the DPDP
 * Act 2023 attaches penalties to inaccurate or incomplete disclosure.
 *
 * Every fact that could not be verified from the codebase is written as
 * `[TO BE CONFIRMED — …]`. Those render with a loud highlight and are listed
 * by `npm run build` verification. Do not publish while any remain.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

export type LegalSection = {
  id: string;
  title: string;
  body: LegalBlock[];
};

export type LegalDoc = {
  slug: "privacy" | "terms";
  title: string;
  shortTitle: string;
  description: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const legalEntity = {
  name: "XLU Technologies Private Limited",
  product: "MeetMyPets",
  site: "meetmypets.app",
  email: "hello@meetmypets.app",
  city: "Coimbatore",
  state: "Tamil Nadu",
  country: "India",
  address: "2nd floor, 178, A, Ramachandra Rd, R.S. Puram, Coimbatore, Tamil Nadu, 641002, India",
  cin: "[TO BE CONFIRMED — CIN]",
  grievanceOfficer: "[TO BE CONFIRMED — Grievance Officer name]",
  grievanceEmail: "[TO BE CONFIRMED — grievance officer email]",
} as const;

const EFFECTIVE = "[TO BE CONFIRMED — effective date]";

/* ========================================================================== */
/* PRIVACY POLICY                                                             */
/* ========================================================================== */

export const privacy: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  shortTitle: "Privacy",
  description:
    "How MeetMyPets collects, uses, shares and protects personal data across pet owners, enthusiasts and verified pet businesses — under India's DPDP Act 2023, the GDPR and the CCPA.",
  updated: EFFECTIVE,
  intro: `This policy explains what personal data ${legalEntity.product} collects, why, who it is shared with, and the rights you have over it. It applies to ${legalEntity.site} and to the ${legalEntity.product} mobile applications.`,
  sections: [
    {
      id: "who-we-are",
      title: "1. Who we are",
      body: [
        {
          type: "p",
          text: `${legalEntity.product} is operated by ${legalEntity.name}, a company incorporated in India (CIN ${legalEntity.cin}), with its registered office at ${legalEntity.address}.`,
        },
        {
          type: "p",
          text: `For the purposes of the Digital Personal Data Protection Act, 2023 ("DPDP Act") we are the Data Fiduciary. Where the EU or UK GDPR applies, we are the Data Controller. Where the CCPA/CPRA applies, we are the Business.`,
        },
        {
          type: "p",
          text: `You can reach us about anything in this policy at ${legalEntity.email}.`,
        },
      ],
    },
    {
      id: "scope",
      title: "2. Who this applies to",
      body: [
        {
          type: "p",
          text: "MeetMyPets serves three distinct groups, and the data we hold differs materially between them. Read the part that applies to you.",
        },
        {
          type: "ul",
          items: [
            "Pet Owners — you create pet profiles, use proximity-based discovery and matching, and may submit vaccination records and identity documents for verification.",
            "Pet Enthusiasts — you take part in community feeds, groups and events without creating a pet profile. You are not asked for vaccination or pet records.",
            "Pet Businesses — vets, groomers, trainers, boarding and retail. You submit business and professional credentials for a verified listing, and your listing is shown to nearby users.",
          ],
        },
        {
          type: "p",
          text: "This policy also covers visitors to meetmypets.app who join the waitlist without creating an account.",
        },
      ],
    },
    {
      id: "what-we-collect",
      title: "3. What we collect",
      body: [
        { type: "h3", text: "Information you give us" },
        {
          type: "ul",
          items: [
            "Account details — name, email address and/or mobile number, password credentials, and profile photo.",
            "Pet profiles — species, breed, name, age, sex, neuter status, temperament notes, photographs, and the intent you set for matching (friendship, playdate or breeding).",
            "Vaccination records — documents you upload for verification, and the data extracted from them (vaccine type, date administered, validity period).",
            "Identity documents — a government-issued identity document, submitted only for owner verification.",
            "Business credentials — registration details, professional qualifications, service categories and operating address, for Pet Business accounts.",
            "Community content — posts, images, comments, group memberships, event responses, and messages exchanged after a match.",
            "Waitlist submissions — an email address or mobile number, and which part of the site you submitted it from.",
          ],
        },
        { type: "h3", text: "Information collected automatically" },
        {
          type: "ul",
          items: [
            "Approximate location, derived from device location or IP, used only to place you in a coarse proximity band. See the location section below.",
            "Device and technical data — device model, operating system, app version, language, and crash diagnostics.",
            "Usage data — features used, screens viewed, and interactions such as matches made or events attended.",
            "Log data — IP address, access times and referring pages.",
          ],
        },
        {
          type: "p",
          text: "We do not knowingly collect special category or sensitive personal data beyond the identity and health-adjacent documents described above, and we do not ask for financial account details on the marketing site.",
        },
      ],
    },
    {
      id: "how-we-use",
      title: "4. How we use your data",
      body: [
        {
          type: "ul",
          items: [
            "To create and maintain your account and pet profiles.",
            "To power discovery and matching, including showing you nearby pets, people and businesses within a proximity band.",
            "To verify owners and pets, and to issue, maintain and withdraw verification badges.",
            "To operate community features — feeds, groups, events and post-match messaging.",
            "To display verified business listings to users in the surrounding area.",
            "To keep the platform safe: detecting fraud, abuse, animal welfare concerns and prohibited conduct.",
            "To communicate with you about your account, safety notices and material changes to this policy.",
            "To improve the product through aggregated analytics.",
            "To comply with legal obligations and respond to lawful requests.",
          ],
        },
        {
          type: "p",
          text: "We do not sell personal data, and we do not share it for cross-context behavioural advertising as those terms are defined under the CCPA/CPRA.",
        },
      ],
    },
    {
      id: "legal-bases",
      title: "5. Consent and legal bases",
      body: [
        {
          type: "p",
          text: "Under the DPDP Act we process personal data on the basis of your consent, given at the point of collection through a clear notice, or where a Legitimate Use under the Act applies — for example, complying with a legal obligation.",
        },
        {
          type: "p",
          text: "Where the GDPR applies, our legal bases are: performance of a contract (operating your account and matching), consent (verification documents, precise location access, marketing messages), legitimate interests (safety, fraud prevention, product improvement), and legal obligation.",
        },
        {
          type: "p",
          text: "You may withdraw consent at any time, and withdrawing is as easy as giving it. Withdrawal does not affect processing already carried out, and some features — notably verified matching — cannot function without the underlying consent.",
        },
      ],
    },
    {
      id: "location",
      title: "6. Location privacy",
      body: [
        {
          type: "p",
          text: "This is the part most people care about, so it is stated plainly: we never reveal your precise location to another user.",
        },
        {
          type: "ul",
          items: [
            "Discovery works on coarse proximity bands. Another user sees a description such as “within 1 km”, never coordinates, never a pin on a map, and never an address.",
            "Your exact coordinates are not published to other users, and are not included in any profile, match or listing shown to them.",
            "You choose where to actually meet, in conversation, after both sides have matched.",
            "You can revoke location permission in your device settings at any time. Discovery will stop working; the rest of the community features continue.",
            "Business listings show a proximity band to the user, derived from the business's stated operating address.",
          ],
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — whether precise coordinates are stored on our servers at all, or only processed on-device to derive the band. This sentence must state the truth precisely.]",
        },
      ],
    },
    {
      id: "verification",
      title: "7. Verification data",
      body: [
        {
          type: "p",
          text: "Verification exists so that a badge means something. It involves the two most sensitive categories of data we handle, and both are treated accordingly.",
        },
        {
          type: "ul",
          items: [
            "Identity documents are used solely to confirm that a real person stands behind a profile. They are reviewed, not published, and are never shown to other users.",
            "Vaccination records are read to extract vaccine type and validity, and matched against the pet on the profile. Other users see only the resulting badge, never the underlying document.",
            "A badge lapses automatically when the vaccination it represents expires, so it always reflects current records.",
            "Verification decisions can be contested — contact us and we will re-review.",
          ],
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — retention period for identity documents after verification completes, and whether the document image is deleted once the check is done.]",
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — whether document processing is performed in-house or by a third-party OCR/KYC provider. If a provider is used it must be named here.]",
        },
      ],
    },
    {
      id: "sharing",
      title: "8. Who we share data with",
      body: [
        {
          type: "p",
          text: "We share personal data only in the circumstances below, and only to the extent necessary.",
        },
        {
          type: "ul",
          items: [
            "With other users — your profile, pet profiles, community content and proximity band are visible according to the settings you choose.",
            "With service providers acting on our instructions, under contract: [TO BE CONFIRMED — full list of processors, e.g. hosting, storage, analytics, email delivery, OCR/KYC].",
            "For legal reasons — where required by law, court order, or a valid request from a public authority.",
            "To protect people or animals — where we reasonably believe disclosure is necessary to prevent harm, including credible animal welfare concerns.",
            "In a corporate transaction — if the business is acquired or merged, subject to this policy continuing to apply.",
          ],
        },
      ],
    },
    {
      id: "children",
      title: "9. Children's data",
      body: [
        {
          type: "p",
          text: "Under the DPDP Act, anyone below eighteen years of age is a child. This is stricter than many other regimes and we apply the Indian standard.",
        },
        {
          type: "ul",
          items: [
            "MeetMyPets is intended for users aged 18 and over.",
            "We do not knowingly process a child's personal data without verifiable consent from a parent or lawful guardian.",
            "We do not undertake tracking or behavioural advertising directed at children, and we do not serve them targeted advertising.",
            "If we learn that we hold a child's data without the required consent, we will delete it.",
          ],
        },
        {
          type: "p",
          text: `If you believe a child has provided us with personal data, contact ${legalEntity.email} and we will act promptly.`,
        },
      ],
    },
    {
      id: "retention",
      title: "10. How long we keep data",
      body: [
        {
          type: "p",
          text: "We keep personal data only as long as it serves the purpose it was collected for, or as long as the law requires.",
        },
        {
          type: "ul",
          items: [
            "Account and profile data — for as long as your account is active. [TO BE CONFIRMED — period retained after account deletion.]",
            "Verification documents — [TO BE CONFIRMED — retention period].",
            "Community content — [TO BE CONFIRMED — whether posts persist after account deletion, and in what form.]",
            "Logs and diagnostics — [TO BE CONFIRMED — retention period].",
            "Waitlist submissions — until launch communications conclude, or until you ask us to remove them.",
          ],
        },
        {
          type: "p",
          text: "When a retention period ends we delete the data or irreversibly anonymise it.",
        },
      ],
    },
    {
      id: "security",
      title: "11. Security",
      body: [
        {
          type: "p",
          text: "We apply reasonable technical and organisational safeguards appropriate to the sensitivity of the data, including encryption in transit, access controls limiting who can view verification documents, and logging of administrative access.",
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — specific measures that can be stated accurately: encryption at rest, retention of audit logs, penetration testing cadence, certifications held.]",
        },
        {
          type: "p",
          text: "No system is perfectly secure. In the event of a personal data breach we will notify the Data Protection Board of India and affected users as required by the DPDP Act, and supervisory authorities and data subjects where the GDPR applies.",
        },
      ],
    },
    {
      id: "your-rights",
      title: "12. Your rights",
      body: [
        { type: "h3", text: "Under the DPDP Act (India)" },
        {
          type: "ul",
          items: [
            "Access — obtain a summary of the personal data we process about you and the processing activities undertaken.",
            "Correction and erasure — have inaccurate or misleading data corrected, completed, updated, or erased.",
            "Grievance redressal — a readily available means of raising a complaint, described below.",
            "Nomination — nominate another individual to exercise your rights in the event of death or incapacity.",
          ],
        },
        { type: "h3", text: "Under the GDPR" },
        {
          type: "ul",
          items: [
            "Access, rectification and erasure.",
            "Restriction of processing, and objection to processing based on legitimate interests.",
            "Data portability in a structured, machine-readable format.",
            "The right to lodge a complaint with your supervisory authority.",
          ],
        },
        { type: "h3", text: "Under the CCPA/CPRA (California)" },
        {
          type: "ul",
          items: [
            "The right to know what personal information is collected, used and disclosed.",
            "The right to delete, and to correct inaccurate personal information.",
            "The right to opt out of sale or sharing — note that we do not sell or share personal information as those terms are defined.",
            "The right not to be discriminated against for exercising these rights.",
          ],
        },
        {
          type: "p",
          text: `To exercise any of these, write to ${legalEntity.email}. We will verify your identity before acting, and respond within the period the applicable law requires.`,
        },
      ],
    },
    {
      id: "grievance",
      title: "13. Grievance redressal",
      body: [
        {
          type: "p",
          text: "The DPDP Act and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 require us to publish a grievance contact and to act on complaints within defined timelines.",
        },
        {
          type: "ul",
          items: [
            `Grievance Officer: ${legalEntity.grievanceOfficer}`,
            `Email: ${legalEntity.grievanceEmail}`,
            `Address: ${legalEntity.address}`,
            "[TO BE CONFIRMED — acknowledgement and resolution timelines committed to, e.g. acknowledge within 24 hours, resolve within 15 days.]",
          ],
        },
        {
          type: "p",
          text: "If you are not satisfied with our response, you may escalate to the Data Protection Board of India.",
        },
      ],
    },
    {
      id: "transfers",
      title: "14. International transfers",
      body: [
        {
          type: "p",
          text: "We operate from India and process data there. Some service providers may process data outside your country.",
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — countries where data is stored or processed, and the transfer mechanism relied on for GDPR purposes, such as Standard Contractual Clauses.]",
        },
      ],
    },
    {
      id: "cookies",
      title: "15. Cookies and similar technologies",
      body: [
        {
          type: "p",
          text: "meetmypets.app is a static marketing site. It sets no advertising or cross-site tracking cookies.",
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — whether any analytics is deployed on the marketing site or in the apps, and if so which provider and whether consent is required.]",
        },
      ],
    },
    {
      id: "changes",
      title: "16. Changes to this policy",
      body: [
        {
          type: "p",
          text: "We may update this policy as the product and the law evolve. Where a change materially affects your rights we will give notice in the app or by email before it takes effect, and the date at the top of this page will always reflect the current version.",
        },
      ],
    },
    {
      id: "contact",
      title: "17. Contact",
      body: [
        {
          type: "p",
          text: `${legalEntity.name}, ${legalEntity.address}. Email ${legalEntity.email}.`,
        },
      ],
    },
  ],
};

/* ========================================================================== */
/* TERMS OF SERVICE                                                           */
/* ========================================================================== */

export const terms: LegalDoc = {
  slug: "terms",
  title: "Terms of Service",
  shortTitle: "Terms",
  description:
    "The agreement governing use of MeetMyPets by pet owners, enthusiasts and verified pet businesses — including verification, breeding matches, offline meetups and content rules.",
  updated: EFFECTIVE,
  intro: `These terms form a binding agreement between you and ${legalEntity.name} governing your use of ${legalEntity.product}. Please read the sections on verification, breeding and offline meetups carefully — they limit what we promise and describe risks you accept.`,
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance",
      body: [
        {
          type: "p",
          text: `By creating an account, joining the waitlist, or otherwise using ${legalEntity.product}, you agree to these terms and to the Privacy Policy. If you do not agree, do not use the service.`,
        },
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility",
      body: [
        {
          type: "ul",
          items: [
            "You must be at least 18 years old to hold an account.",
            "You must have the legal capacity to enter into a binding agreement.",
            "You must not be barred from using the service under the laws applying to you.",
            "Business accounts must be opened by someone authorised to bind that business.",
          ],
        },
      ],
    },
    {
      id: "accounts",
      title: "3. Your account",
      body: [
        {
          type: "ul",
          items: [
            "Provide accurate information and keep it current — verification depends on it.",
            "You are responsible for activity under your account and for keeping credentials secure.",
            "One person, one account. Do not impersonate anyone or misrepresent a pet's ownership, health or lineage.",
            "Tell us promptly if you suspect unauthorised access.",
          ],
        },
      ],
    },
    {
      id: "personas",
      title: "4. How the three account types work",
      body: [
        {
          type: "ul",
          items: [
            "Pet Owners may create pet profiles, use discovery and matching, arrange playdates, and pursue vaccination-verified breeding matches.",
            "Pet Enthusiasts may use community feeds, groups and events without a pet profile. Matching features require a verified pet.",
            "Pet Businesses may hold a verified listing, appear in local discovery, and post services and events. Listings are subject to the credential checks described in section 7.",
          ],
        },
      ],
    },
    {
      id: "content",
      title: "5. Your content",
      body: [
        {
          type: "p",
          text: "You keep ownership of everything you post. You grant us a non-exclusive, worldwide, royalty-free licence to host, store, reproduce and display your content solely to operate and promote the service, for as long as you keep it on the platform.",
        },
        {
          type: "p",
          text: "You confirm you have the rights to what you post, including any photograph containing another person or their animal.",
        },
      ],
    },
    {
      id: "verification",
      title: "6. What a verification badge means",
      body: [
        {
          type: "p",
          text: "This section limits what you may infer from a badge. Read it before relying on one.",
        },
        {
          type: "ul",
          items: [
            "A badge evidences that we reviewed documents presented to us at a point in time and that they appeared consistent with the profile.",
            "A badge is not a warranty of an animal's health, temperament, behaviour, pedigree or fitness for breeding.",
            "A badge is not a guarantee about a person's character or conduct.",
            "Documents can be forged and checks can fail. Verification reduces risk; it does not remove it.",
            "We may withdraw a badge at any time, including automatically when a vaccination lapses.",
          ],
        },
        {
          type: "p",
          text: "You remain responsible for your own due diligence before meeting anyone or allowing contact between animals.",
        },
      ],
    },
    {
      id: "breeding",
      title: "7. Breeding matches",
      body: [
        {
          type: "p",
          text: "Breeding features connect owners. They do not supervise, endorse or take part in any resulting arrangement.",
        },
        {
          type: "ul",
          items: [
            "You are solely responsible for complying with all laws applying to animal breeding, sale and transport where you are.",
            "You are responsible for the welfare of the animals involved, before, during and after any arrangement.",
            "We require vaccination verification for breeding intent, but this is not a health screening, a genetic screening, or veterinary advice.",
            "Consult a qualified veterinarian before breeding. Nothing on the platform substitutes for professional veterinary judgement.",
            "Using the platform to facilitate unlawful breeding, puppy farming, or the sale of animals in breach of local law is prohibited and will result in removal.",
          ],
        },
      ],
    },
    {
      id: "meetups",
      title: "8. Offline meetings and safety",
      body: [
        {
          type: "p",
          text: "MeetMyPets helps people find each other. What happens when you meet is outside our control.",
        },
        {
          type: "ul",
          items: [
            "Meet in public places, tell someone where you are going, and trust your judgement.",
            "Introduce animals carefully. Even well-socialised animals can behave unpredictably with strangers.",
            "You accept the risks of meeting other users and of contact between animals, including injury to people or animals and damage to property.",
            "We do not conduct criminal background checks on users.",
            "Report unsafe behaviour or animal welfare concerns to us, and to the appropriate authorities where warranted.",
          ],
        },
      ],
    },
    {
      id: "businesses",
      title: "9. Business listings",
      body: [
        {
          type: "ul",
          items: [
            "Verification of a business confirms that credentials presented to us were checked. It is not an endorsement, recommendation, or assurance of service quality.",
            "Businesses are responsible for holding and maintaining all licences and registrations their services require.",
            "Any transaction between a user and a business is between those parties. We are not a party to it.",
            "Businesses must keep listing information accurate, and must not advertise services they are not qualified to provide.",
          ],
        },
      ],
    },
    {
      id: "prohibited",
      title: "10. Prohibited conduct",
      body: [
        {
          type: "p",
          text: "You must not, and must not permit anyone to:",
        },
        {
          type: "ul",
          items: [
            "Post content depicting or promoting animal cruelty, neglect, or fighting.",
            "Offer animals for sale or transfer in breach of applicable law.",
            "Harass, threaten, stalk, or impersonate any person.",
            "Misrepresent a pet's health, vaccination status, age or lineage.",
            "Upload forged, altered or another person's documents.",
            "Scrape, reverse engineer, or attempt to extract other users' locations or personal data.",
            "Post unlawful, defamatory, obscene, or infringing content.",
            "Use the service for spam, fraud, or any unlawful purpose.",
          ],
        },
      ],
    },
    {
      id: "moderation",
      title: "11. Moderation, takedown and grievances",
      body: [
        {
          type: "p",
          text: "We may remove content or suspend accounts that breach these terms, and we act on complaints in line with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.",
        },
        {
          type: "ul",
          items: [
            `Grievance Officer: ${legalEntity.grievanceOfficer}`,
            `Email: ${legalEntity.grievanceEmail}`,
            "[TO BE CONFIRMED — acknowledgement and resolution timelines, and the appeal route for a moderation decision.]",
          ],
        },
      ],
    },
    {
      id: "ip",
      title: "12. Intellectual property",
      body: [
        {
          type: "p",
          text: `The ${legalEntity.product} name, logo, software, design and content are owned by ${legalEntity.name} and protected by law. These terms grant you a limited, revocable, non-transferable licence to use the service for its intended purpose, and nothing more.`,
        },
      ],
    },
    {
      id: "third-party",
      title: "13. Third-party services",
      body: [
        {
          type: "p",
          text: "The service may link to or rely on third parties — app stores, maps, payment or verification providers. Their terms govern their services, and we are not responsible for them.",
        },
      ],
    },
    {
      id: "disclaimers",
      title: "14. Disclaimers",
      body: [
        {
          type: "p",
          text: 'The service is provided "as is" and "as available". To the fullest extent permitted by law we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose and non-infringement.',
        },
        {
          type: "p",
          text: "We do not warrant that the service will be uninterrupted or error-free, that matches will be suitable, or that any user, pet or business is as described.",
        },
        {
          type: "p",
          text: "Nothing on the platform is veterinary, legal or professional advice.",
        },
      ],
    },
    {
      id: "liability",
      title: "15. Limitation of liability",
      body: [
        {
          type: "p",
          text: "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive damages, nor for loss of profits, data or goodwill, arising from your use of the service — including anything that happens during or after an offline meeting or a breeding arrangement.",
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — aggregate liability cap, e.g. amounts paid to us in the preceding twelve months, or a fixed sum.]",
        },
        {
          type: "p",
          text: "Nothing here excludes liability that cannot lawfully be excluded, including for death or personal injury caused by negligence, or for fraud.",
        },
      ],
    },
    {
      id: "indemnity",
      title: "16. Indemnity",
      body: [
        {
          type: "p",
          text: "You agree to indemnify and hold harmless XLU Technologies Private Limited and its officers and employees against claims, losses and reasonable legal costs arising from your content, your use of the service, your breach of these terms, or your conduct towards another user or animal.",
        },
      ],
    },
    {
      id: "termination",
      title: "17. Suspension and termination",
      body: [
        {
          type: "p",
          text: "You may close your account at any time. We may suspend or terminate access where you breach these terms, where we are required to by law, or where continued access would put users or animals at risk. Sections that by their nature should survive termination — content licence for material you leave published, disclaimers, liability limits, indemnity and governing law — do survive.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "18. Governing law and disputes",
      body: [
        {
          type: "p",
          text: `These terms are governed by the laws of India. The courts at ${legalEntity.city}, ${legalEntity.state} have exclusive jurisdiction, subject to any mandatory rights you have as a consumer to bring proceedings where you live.`,
        },
        {
          type: "p",
          text: "[TO BE CONFIRMED — whether arbitration is required before litigation, and if so the seat and rules.]",
        },
      ],
    },
    {
      id: "changes",
      title: "19. Changes to these terms",
      body: [
        {
          type: "p",
          text: "We may update these terms. Material changes will be notified in the app or by email before they take effect. Continuing to use the service after that means you accept the updated terms.",
        },
      ],
    },
    {
      id: "contact",
      title: "20. Contact",
      body: [
        {
          type: "p",
          text: `${legalEntity.name}, ${legalEntity.address}. Email ${legalEntity.email}.`,
        },
      ],
    },
  ],
};

export const legalDocs = [privacy, terms] as const;
