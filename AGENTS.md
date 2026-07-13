# AGENTS.md - Project Context for OpenCode

## Project Overview
**anilog** - Next.js 16 (App Router) anime tracking/logging app with TypeScript, React 19, Tailwind CSS v4.

## Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Auth**: Better Auth (email/password + Google OAuth)
- **File Upload**: UploadThing
- **UI**: Shadcn UI (base-mira style) + Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **State**: Zustand + SWR
- **Styling**: Tailwind CSS v4 + class-variance-authority + tailwind-merge

## Key Commands
```bash
npm run dev       # dev server (next dev)
npm run build     # production build (next build)
npm run start     # production server (next start)
npm run lint      # lint (eslint)
npx drizzle-kit generate  # generate migrations
npx drizzle-kit migrate   # run migrations
npx drizzle-kit studio    # open Drizzle Studio
```

## Environment Variables (see .env.example)
```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=... (optional)
GOOGLE_CLIENT_SECRET=... (optional)
UPLOADTHING_TOKEN=... (optional)
ANILIST_CLIENT_ID=... (optional)
ANILIST_CLIENT_SECRET=... (optional)
ANILIST_REDIRECT_URI=... (optional, defaults to ${BETTER_AUTH_URL}/api/anilist/callback)
```

## AniList Integration
- **Purpose**: Connect a user's AniList account to sync list changes and import entries.
- **Auth flow**: OAuth2 Authorization Code Grant. AniList returns only a long-lived
  access token (no refresh token, no profile/email), so AniList is a *linked
  account*, not a login method. Identity is fetched via the `Viewer` GraphQL query.
- **Register an app**: https://anilist.co/settings/developer
  - Set redirect URI to `${BETTER_AUTH_URL}/api/anilist/callback`
- **Server lib**: `lib/anilist/` — `client.ts` (GraphQL fetcher w/ rate-limit
  retry), `oauth.ts` (auth URL + token exchange), `mapping.ts` (status/type
  transforms), `types.ts`.
- **Actions**: `actions/anilist.ts` (connect/disconnect/connection status),
  `actions/anilist-import.ts` (import public list by username, sync from own).
- **Write-through sync**: `actions/media.ts` mirrors create/update/progress/delete
  to AniList when a connected account exists and the entry has an `anilistMediaId`.
  AniList failures are logged but never block the local write.
- **API route**: `app/api/anilist/callback/route.ts` handles the OAuth redirect.
- **Schema**: `anilist_account` table (one row per user), `media.anilistMediaId`
  + `media.anilistListEntryId` columns, unique on `(userId, anilistMediaId)`.
- **Rate limits**: AniList allows 90 req/min normally (currently degraded to
  ~30/min). The client retries with backoff on 429; bulk imports throttle
  between requests.


## Project Structure
```
app/              # Next.js App Router pages
├── (auth)/       # Auth route group
├── api/          # API routes
components/       # React components
├── ui/           # Shadcn UI components
├── auth/         # Auth components
lib/              # Core utilities
├── db.ts         # Drizzle client (Neon)
├── auth.ts       # Better Auth server config
├── auth-client.ts# Better Auth client
├── uploadthing/  # UploadThing config
schema/           # Drizzle schemas
├── index.ts      # Schema exports
├── auth-schema.ts# Auth tables
├── media-schema.ts# Media tables
components.json   # Shadcn UI config (base-mira, RSC, CSS vars)
```

## Path Aliases
- `@/*` → project root
- `@/components` → components
- `@/lib` → lib
- `@/hooks` → hooks
- `@/components/ui` → UI components

## Key Conventions
- **App Router** with route groups: `(auth)` for auth pages
- **RSC** enabled (RSC: true in components.json)
- **CSS Variables** for theming (cssVariables: true)
- **Path aliases** via `@/*` in tsconfig.json
- **Drizzle schemas** in `/schema` (not `/db` or `/lib/schema`)
- **Auth** configured in `lib/auth.ts` (server) and `lib/auth-client.ts` (client)
- **UploadThing** in `lib/uploadthing/`

## Auth (Better Auth)
- Email/password enabled
- Google OAuth optional (requires GOOGLE_CLIENT_ID/SECRET)
- Server config: `lib/auth.ts`
- Client config: `lib/auth-client.ts`
- Session via cookies (default)

## Database (Drizzle + Neon)
- Schema: `/schema/index.ts` (exports all)
- Migrations: `/drizzle/`
- Config: `drizzle.config.ts` (PostgreSQL, Neon HTTP driver)
- Run migrations: `npx drizzle-kit migrate`

## UploadThing
- Config: `lib/uploadthing/`
- Token in `UPLOADTHING_TOKEN`
- React components in `components/image-uploader.tsx`

## Lint/Typecheck
- `npm run lint` (ESLint with Next.js config)
- `npx tsc --noEmit` (TypeScript check, no emit)
- ESLint config: `eslint.config.mjs` (extends Next.js core-web-vitals + TypeScript)

## Common Patterns
- **Forms**: React Hook Form + Zod resolvers (`@hookform/resolvers/zod`)
- **UI**: Shadcn components in `components/ui/`, custom in `components/`
- **State**: Zustand stores in `store/`
- **Data fetching**: SWR hooks
- **Icons**: Lucide React + Tabler Icons
- **Date**: date-fns
- **Charts**: Recharts

## CI/CD Notes
- No CI config found in repo (check `.github/workflows/` if added)
- Build command: `npm run build`
- Runs on Node 20+ (Next.js 16 requirement)

## Common Tasks
- Add shadcn component: `npx shadcn@latest add <component>`
- Add Drizzle migration: edit schema → `npx drizzle-kit generate`
- Add auth provider: edit `lib/auth.ts` + add env vars
- Add upload route: edit `lib/uploadthing/` + add component