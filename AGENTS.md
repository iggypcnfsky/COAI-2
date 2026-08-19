## Learned User Preferences

- Keep the frontend as a Vite SPA; do not migrate to Next.js.
- Do not run railway-agent unless explicitly asked.
- Do not create markdown files unless asked.
- Never delete production user data.
- PWA and PostHog were removed on purpose; do not re-add them.
- Database failures during auth must not be returned as 401 Unauthorized.

## Learned Workspace Facts

- Stack is a Vite SPA plus a Hono API on Railway Postgres, with Clerk auth, OpenRouter for chat/synth/team generation, and Stripe billing; the app is migrated off Supabase.
- Local web is Vite on port 5173; the API is Hono on port 8787; Vite proxies `/api` to the local API.
- Docker Desktop is not installed; local Postgres is Homebrew `postgresql@16` with user and database `coai` on localhost:5432, matching `api/.env`.
- Apply schema with `npm run db:migrate --prefix api`.
- `@clerk/backend` public `verifyToken` uses `withLegacyReturn`: it returns the JWT payload (`payload.sub`) and throws on failure; do not treat the result as `{ data, errors }`.
- Images remain SVG placeholders until a later image provider is chosen.
