# AniLog Performance + Inngest Background Sync Plan

## Summary

- Move slow AniList network work out of user-facing server actions and into Inngest background functions.
- Keep local DB writes synchronous so UI updates are fast and durable; enqueue AniList sync after local success.
- Remove manual entry creation from the UI. Entries should come from AniList import/sync only.
- Replace loading every item at once with server-side pagination so images/content load page by page.
- Improve edit/progress UX with optimistic updates, debounced progress commits, and non-blocking sync state.

## Key Changes

- Add Inngest client, App Router `/api/inngest` route, and functions for media sync, delete sync, and import jobs.
- Add media sync status fields and an AniList import job table for background job visibility.
- Update media actions so local database writes return quickly and AniList calls run asynchronously.
- Update import actions so imports enqueue a background job instead of blocking the page.
- Remove the manual add-entry modal from the main library controls.
- Add server-side pagination, SQL filtering/search, and lazy poster rendering.
- Allow repeated progress button clicks with optimistic local state and debounced server commits.

## Test Plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Verify connected AniList updates return quickly and create Inngest runs.
- Verify repeated progress clicks update immediately and sync only the final value after the debounce window.
- Verify public and connected imports enqueue jobs and update job status.
- Verify pagination loads one page at a time and search/status filters match DB results.
- Verify the manual add-entry UI is removed.

## Assumptions

- Local DB writes remain synchronous for correctness and immediate UI feedback.
- Entries are added through AniList import/sync, not arbitrary manual creation.
- Pagination is preferred over infinite scroll.
