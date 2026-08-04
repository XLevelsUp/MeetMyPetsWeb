MeetMyPets web — an npm-workspaces monorepo:

- `apps/landing` — the public marketing/waitlist site (`meetmypets.app`), fully static export.
- `apps/admin` — the moderator/founder admin panel (`admin.meetmypets.app`), server-rendered.

## Getting Started

From the repo root:

```bash
npm install

npm run dev:landing   # landing site on http://localhost:3000
npm run dev:admin     # admin panel on http://localhost:3001

npm run build:landing # static export to apps/landing/out
npm run build:admin

npm run typecheck     # both workspaces
npm run lint          # both workspaces
```

The landing page lives at `apps/landing/src/app/page.tsx`; it auto-updates as you edit.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Android App Links — `apps/landing/public/.well-known/assetlinks.json`

That file is a Digital Asset Links statement. It is what lets
`https://meetmypets.app/pet/<uuid>` and `/post/<uuid>` open the MeetMyPets Android app
directly instead of bouncing to Chrome.

Android's App Links verifier fetches it at install time. If it 404s, verification fails
(`adb shell pm get-app-links com.example.meet_my_pets` reports `1024`) and the OS hands the
URL to the default browser. It lives in `public/` — not `src/app/` — because files there are
copied verbatim into the static export and are unaffected by `trailingSlash: true`.

It contains no comments because Android requires it to parse as strict JSON; a `//` line
would break the very verification it exists to enable.

**Two things that will silently break it:**

1. **The fingerprint must be updated whenever the app signing key changes.** The
   debug/upload key and the Play App Signing key have *different* SHA-256 fingerprints, so an
   app distributed through Play usually needs the fingerprint from
   *Play Console → Setup → App signing* added as well. `sha256_cert_fingerprints` is an array
   — list every key that ships, rather than replacing one with another.
2. **It must be reachable with no redirect.** The verifier does not follow redirects, so
   `https://meetmypets.app/.well-known/assetlinks.json` has to return `200` directly. If the
   apex is redirecting to `www`, verification fails even though the file is deployed. Check
   with:
   ```bash
   curl -sI https://meetmypets.app/.well-known/assetlinks.json | head -1
   ```

The package name must also stay in lockstep with the Android manifest — it is currently the
`com.example.*` placeholder.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
