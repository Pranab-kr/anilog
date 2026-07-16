# AGENTS.md - Project Context for OpenCode

## Project Overview
**anilog** - Next.js 16 (App Router) anime tracking/logging app with TypeScript, React 19, Tailwind CSS v4, and Inngest background jobs.

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Auth**: Better Auth v1 (email/password + Google OAuth)
- **File Upload**: UploadThing
- **Background Jobs**: Inngest (handles async events like AniList sync, deletions, imports, and idempotent media creation)
- **UI**: Shadcn UI (base-mira style) + Tailwind CSS v4 + Framer Motion (motion)
- **Forms**: React Hook Form + Zod
- **State**: Zustand + SWR
- **Styling**: Tailwind CSS v4 + class-variance-authority + tailwind-merge

## Key Commands
```bash
# Package manager options: bun (preferred, bun.lock exists) or npm
bun run dev         # dev server (next dev)
bun run build       # production build (next build)
bun run start       # production server (next start)
bun run lint        # lint (eslint)

# Drizzle Kit Commands
bunx drizzle-kit generate  # generate migrations
bunx drizzle-kit migrate   # run migrations
bunx drizzle-kit studio    # open Drizzle Studio

# Inngest Background Jobs Dev Server
bunx inngest-cli@latest dev  # Start Inngest local dev server (port 8288)
```

## Environment Variables (see .env.example)
```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=... (optional)
GOOGLE_CLIENT_SECRET=... (optional)
UPLOADTHING_TOKEN=... (optional)

# AniList Integration (optional)
ANILIST_CLIENT_ID=...
ANILIST_CLIENT_SECRET=...
ANILIST_REDIRECT_URI=... (defaults to ${BETTER_AUTH_URL}/api/anilist/callback)

# Inngest Configuration
INNGEST_DEV=1
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

## AniList Integration
- **Purpose**: Connect a user's AniList account to sync list changes and import entries.
- **Auth flow**: OAuth2 Authorization Code Grant. AniList returns only a long-lived access token (no refresh token, no profile/email), so AniList is a *linked account*, not a login method. Identity is fetched via the `Viewer` GraphQL query.
- **Register an app**: https://anilist.co/settings/developer
  - Set redirect URI to `${BETTER_AUTH_URL}/api/anilist/callback`
- **Server lib**: `lib/anilist/`
  - `client.ts`: GraphQL fetcher with rate-limit retry.
  - `oauth.ts`: Auth URL generator and token exchange.
  - `mapping.ts`: Status and type transforms between local DB and AniList.
  - `importer.ts`: Core logic for importing public lists or connected account entries.
  - `types.ts`: Typings for AniList API responses.
- **Actions**:
  - `actions/anilist.ts`: Connection status check, OAuth URL builder, token callback exchange, and account disconnection.
  - `actions/anilist-import.ts`: Triggers public/private list imports via Inngest and queries import job status.
  - `actions/anilist-search.ts`: Queries the AniList database for media.
  - `actions/explore.ts`: AniList proxy queries for the Explore hub (airing calendar, seasonal, top media, schedules).
- **Schema**:
  - `anilist_account` table: Stores access tokens and AniList user details (one row per user).
  - `media`: Contains `anilistMediaId`, `anilistListEntryId`, and sync fields (`anilistSyncStatus`, `anilistSyncError`, `anilistSyncedAt`, `anilistUpdatedAt`).
  - `anilist_import_job` table: Stores status and logs of background import processes.
- **Rate limits**: AniList allows 90 req/min normally (can degrade). The client retries with backoff on 429; bulk imports throttle between requests.

## Background Jobs (Inngest)
- **Endpoint**: `/api/inngest` (`app/api/inngest/route.ts`).
- **Client & Dispatcher**: `lib/inngest/client.ts` exports `inngest` and `sendInngestEvent`.
- **Functions** (`lib/inngest/functions.ts`):
  - `syncMediaToAniList`: Debounced (2s) and throttled sync of created/updated entries to AniList.
  - `deleteMediaFromAniList`: Throttled deletion of entries on AniList.
  - `runAniListImport`: Asynchronous processing of public or connected list imports.
  - `addMediaEntry`: Handles idempotent media row creation to avoid duplicates from rapid clicks.

## Project Structure
```
app/                    # Next.js App Router pages
├── (auth)/             # Auth route group (login, signup)
├── api/                # API routes
│   ├── anilist/        # OAuth callback handler
│   ├── auth/           # Better Auth [...all] handler
│   ├── inngest/        # Inngest integration endpoint
│   └── uploadthing/    # UploadThing endpoint
├── explore/            # Explore section hub (seasonal, upcoming, charts)
├── globals.css         # Tailwind CSS v4 styling & CSS variables theme
├── layout.tsx          # Root layout
└── page.tsx            # Authenticated home page (redirects to /login if unauthenticated)
components/             # React components
├── ui/                 # Shadcn UI (base-mira style components)
├── auth/               # Auth form components
├── explore/            # Explore calendar, browsers, search, grids
├── header-actions.tsx  # Header navigation and buttons
└── image-uploader.tsx  # UploadThing wrapper
lib/                    # Core utilities
├── anilist/            # AniList client modules
├── inngest/            # Inngest client, events, and functions
├── db.ts               # Drizzle client (Neon)
├── auth.ts             # Better Auth server configuration
├── auth-client.ts      # Better Auth client config
└── utils.ts            # CN class merger
schema/                 # Drizzle schemas
├── index.ts            # Schema exports
├── auth-schema.ts      # Auth tables (user, session, account, verification)
└── media-schema.ts     # Media tracker, AniList accounts, import jobs
store/                  # Zustand stores
└── media-store.ts      # Media list state
validation/             # Zod validation schemas
└── auth/               # Login & signup schemas
components.json         # Shadcn UI configuration
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
- **Background Jobs** enqueued with `sendInngestEvent` from `lib/inngest/client.ts` rather than running heavy work inside Server Actions.

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
- Run migrations: `bunx drizzle-kit migrate`

## UploadThing
- Config: `lib/uploadthing/`
- Token in `UPLOADTHING_TOKEN`
- React components in `components/image-uploader.tsx`

## Lint/Typecheck
- `bun run lint` (ESLint with Next.js config)
- `bunx tsc --noEmit` (TypeScript check, no emit)
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
- No CI config found in repo
- Build command: `bun run build`
- Runs on Node 20+ (Next.js 16 requirement)

## Common Tasks
- Add shadcn component: `bunx shadcn@latest add <component>`
- Add Drizzle migration: edit schema → `bunx drizzle-kit generate`
- Add auth provider: edit `lib/auth.ts` + add env vars
- Add upload route: edit `lib/uploadthing/` + add component
- Run Inngest dev server: `bunx inngest-cli@latest dev`