# Deployment

Two apps, two Vercel projects. Only the marketing site is deployed today.

> **The one thing to remember:** *Root Directory is a Vercel dashboard setting,
> not a file in this repo.* Renaming or moving a workspace folder silently
> breaks the deploy, and **nothing in CI will catch it** — CI builds from the
> repo root with `npm run build:marketing`, which keeps passing while production
> is broken. If you move `apps/*`, change the dashboard in the same sitting.
>
> This is not hypothetical. The deploy was broken from
> `7a9fc70` ("convert repo to npm-workspaces monorepo") until 2026-08-16,
> because that commit moved `src/app/` to `apps/landing/src/app/` and the Root
> Directory still said the repo root. The failure looks like this and names the
> real cause plainly, so read it literally:
>
> ```
> Error: > Couldn't find any `pages` or `app` directory.
>          Please create one under the project root
> ```

---

## `meetmypets.app` ← `apps/marketing`

Node runtime (`next start` / Vercel functions) — not a static export since the
Instagram proxy. Public pages are prerendered or ISR; the Route Handlers are
`/api/instagram/*` and the blog's `/api/revalidate/`.

### Settings → Build & Deployment

| Setting | Value | Why |
|---|---|---|
| **Root Directory** | `apps/marketing` | The app is a workspace, not the repo root |
| **Include files outside of the Root Directory** | **ON** | `next.config.ts` sets `outputFileTracingRoot` two levels up, and the lockfile plus hoisted `node_modules` live at the repo root. Off, the build fails on module resolution rather than on anything that names this setting |
| **Framework Preset** | Next.js | |
| **Build Command** | *Override off* | Runs `build` from `apps/marketing/package.json` = `next build`. ⚠️ This field once held `npm run vercel-build`, a script that has never existed in this repo — if you see it again, clear it |
| **Install Command** | *Override off* | Vercel detects the npm workspace root and installs from there |
| **Output Directory** | *Override off* | Vercel's Next.js builder finds `.next/` itself. Hard-coding a directory while the preset is Next.js fights the builder |
| **Node.js Version** | 22.x | Matches `.github/workflows/ci.yml` |

### Environment variables

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_WAITLIST_ENDPOINT` | Production + Preview | The Apps Script `/exec` URL |

⚠️ **This one fails silently.** `NEXT_PUBLIC_*` values are inlined by the bundler
at **build** time — `isWaitlistConfigured` in
[`src/lib/waitlist.ts`](../apps/marketing/src/lib/waitlist.ts) is a build-time
constant. If the variable is missing when the build runs, **the deploy still
succeeds** and ships a site whose waitlist form renders a "not connected" state.
Saving the variable afterwards changes nothing until you **redeploy**.

Full Google Sheet + Apps Script setup is documented in
[`apps/marketing/.env.example`](../apps/marketing/.env.example); the script
itself is [`docs/apps-script/Code.gs`](./apps-script/Code.gs).

### After a root-directory change

Redeploy with **"Use existing Build Cache" off** — the cache was built against a
different project root.

---

## Blog CMS (both projects)

Articles are written at `admin.meetmypets.app/blogs` and served by
`meetmypets.app/blog/` as ISR. Full design: the header comments of
`apps/marketing/src/lib/blog.ts` and `apps/admin/src/lib/blogs.ts`.

**Before the first deploy:**

1. Apply `supabase/migrations/20261008000000_blog_cms.sql`, then
   `20261008000001_blog_seed.sql` (the five launch posts; safe to re-run).
2. Generate one secret and set it in BOTH projects as `BLOG_REVALIDATE_SECRET`.
3. Marketing: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (publishable, never the
   secret key). Redeploy after setting them — `next.config.ts` reads the URL at
   build time for the image allowlist.
4. Admin: `MARKETING_SITE_URL=https://www.meetmypets.app` — the host that does
   not redirect (apex currently 308s to www, which would drop the secret).

**After deploy, verify:**

```bash
curl -s https://www.meetmypets.app/sitemap.xml | grep -c '/blog/'   # index + published posts
curl -s -o /dev/null -w '%{http_code}
' -X POST https://www.meetmypets.app/api/revalidate/   # expect 401
```

Then publish a test draft from the admin and confirm the green "Published"
toast (an amber "may still show the old version" toast means the refresh call
failed — its message says why, and "Refresh site" retries).

**Access:** Blogs is open to `super_admin` and `moderator` (`BLOG_ROLES` in
`apps/admin/src/lib/roles.ts`). There is no marketing role; staff who only
publish need a moderator account, which also shows them moderation surfaces.

---

## After every production deploy

```bash
# 1. Android App Links must be served with NO redirect. The verifier does not
#    follow them, so an apex → www redirect fails verification even though the
#    file deployed correctly. Expect "200" and no `location:` header.
curl -sI https://meetmypets.app/.well-known/assetlinks.json | head -1

# 2. trailingSlash: true — /privacy resolves to /privacy/
curl -sI https://meetmypets.app/privacy

# 3. Canonical URLs come from the hardcoded site.url, not the deploy URL
curl -s https://meetmypets.app/sitemap.xml
```

Then **submit the waitlist form** and confirm the row lands in the Sheet.

Do not treat the success animation as proof: `submitWaitlist` posts with
`mode: "no-cors"` and gets an opaque response, so it returns `ok: true` as soon
as the request is *dispatched* — it cannot see a server-side failure. The Sheet
is the only confirmation. (The reasoning for that trade-off is in the file
header of `waitlist.ts`; it is deliberate, not an oversight.)

---

## `admin.meetmypets.app` ← `apps/admin`

**Not deployed yet.** When it is, it needs a **separate Vercel project** — same
repo, Root Directory `apps/admin`.

It is not a static export: RBAC needs `proxy.ts`, `cookies()` and Route
Handlers, so it requires a real server runtime. Same Root Directory and
"include files outside" rules as above.

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Public by definition |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all | Browser-safe; RLS is what protects data behind it |
| `SUPABASE_SECRET_KEY` | Production (+ Preview only if you accept the risk) | **Bypasses RLS entirely.** Never give it a `NEXT_PUBLIC_` prefix — `src/lib/supabase/admin.ts` guards its client with `import "server-only"`, but the prefix would leak the value into the browser bundle regardless of that guard |

Two decisions to make deliberately before it goes up, rather than discovering
them afterwards:

- **Preview deployments expose a live moderation panel** on a guessable URL,
  pointed at the production database. Either give previews their own Supabase
  project or put Vercel Deployment Protection in front of them.
- **Every admin is a real app account.** The app team's
  `identity.handle_new_user()` trigger fires on any `auth.users` insert, so
  admin sign-ups appear in `/users` and in the user count — see
  `docs/admin/schema-notes.md`.

See [`apps/admin/.env.example`](../apps/admin/.env.example) for the values.
