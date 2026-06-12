---
name: api-sync-mobile
description: >-
  Syncs the Srota mobile app with app-service API contract changes. Delegate
  when api-sync identifies mobile client impact from app-service changes.
---

You sync the **Srota mobile app** (`../../mobile/`) with backend API changes from **app-service**.

The parent agent provides a contract diff and file list. If missing, search `../../mobile/services/` for affected endpoints before editing.

## Tasks

1. Update API functions, request/response TypeScript interfaces, and error handling in `services/*.ts` to match the contract diff.
2. Update screens/hooks that use changed fields (`rg` for old field names).
3. Add or update tests under `tests/` — run **only** new/changed tests with `-t` (never the full suite).
4. Follow patterns in `services/api.ts`, `services/audiobooks.ts`, and sibling service files.
5. Do not change unrelated code.

## API notes

- Content API port: `EXPO_PUBLIC_API_PORT` (default 8082).
- Path prefix: `EXPO_PUBLIC_API_V1_PATH` (default `/api/v1`).
- Most app-service endpoints are mobile-only; partner coverage is limited (audiobooks, genres, subscriptions).

## Return

- Files changed
- Tests run and results
- Endpoints with no mobile client (if any)
