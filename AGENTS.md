<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo layout

npm-workspaces monorepo. `apps/landing` is the static-export marketing site
(`output: "export"` — no middleware/proxy, cookies, Route Handlers, or Server
Actions there). `apps/admin` is the server-rendered admin panel. Run scripts
from the root: `npm run dev:landing` / `dev:admin` / `build:landing` /
`build:admin` / `typecheck` / `lint`. `node_modules` is hoisted to the root,
so the Next.js docs path above is unchanged.
