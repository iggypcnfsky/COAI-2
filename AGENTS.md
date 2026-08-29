## Learned User Preferences

- Keep the frontend as a Vite SPA; do not migrate to Next.js.
- Do not run railway-agent unless explicitly asked.
- Do not create markdown files unless asked.
- Never delete production user data.
- PWA, PostHog, and the Files tab were removed on purpose; do not re-add them.
- Database failures during auth must not be returned as 401 Unauthorized.
- Use "Groups" in the product UI, not "Teams".
- Open synth/group details, create, and edit inside the left sidebar rather than extra sidebars or standalone modals. Put the user avatar at the bottom left; keep the logo and sidebar minimizer inline with synths/groups (no empty top nav). When the sidebar is collapsed, synth and group controls should be icons only. Synths should be the default open section. The divider between the sidebar and chat should be resizable.
- Use Google Sans Flex as the app font.
- AI-driven synth and group creation is a text prompt only; keep model, gender, and age pickers for manual create.
- Group chats should feel like a natural multi-party conversation: members are aware of each other, speaker order is not fixed, and replies split into shorter sequential bubbles instead of one long paragraph. Stream bubbles in short bursts (a few words at a time) with varied, narrower widths rather than identical full-width walls of text.
- New synths are public by default; do not restore a private/public sidebar split.

## Learned Workspace Facts

- Stack is a Vite SPA plus a Hono API on Railway Postgres, with Clerk auth, OpenRouter for chat/synth/group generation, Replicate (`black-forest-labs/flux-schnell`) for portraits, a Railway S3 bucket for chat image uploads, and Stripe billing; the app is migrated off Supabase.
- Local web is Vite on port 5173; the API is Hono on port 8787; Vite proxies `/api` to the local API.
- Docker Desktop is not installed; local Postgres is Homebrew `postgresql@16` with user and database `coai` on localhost:5432, matching `api/.env`.
- Apply schema with `npm run db:migrate --prefix api`.
- `@clerk/backend` public `verifyToken` uses `withLegacyReturn`: it returns the JWT payload (`payload.sub`) and throws on failure; do not treat the result as `{ data, errors }`.
- Default OpenRouter model is `google/gemini-3.7-flash`; which models appear when creating a synth is controlled in OpenRouter profile settings.
- Production domains are `corals.up.railway.app` (web) and `corals-production.up.railway.app` (API).
- Stripe test vs live is selected with API `STRIPE_MODE` (`test` or `live`).
- OpenRouter keys and billing live in the Clerk profile modal.
- Group generation should produce diverse members and avoid duplicate names, ages, and appearances.
- Product branding is Corals (page title, landing, and logo), not COAI.
- In-app design lab lives at `/design` (Storybook-style component catalog and mockup export).
