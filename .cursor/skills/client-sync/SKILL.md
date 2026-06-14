---
name: client-sync
description: >-
  Cross-repo API contract sync: compares app-service development with mobile
  and partner-app development, finds drift, and delegates fixes to sub-agents.
  Use only when the user types /client-sync in Agent chat for app-service.
disable-model-invocation: true
---

# Client Sync (app-service)

## Invocation

Run **only** when the user types `/client-sync` in Agent chat. Do not run automatically after API edits — wait for explicit invocation.

## Goal

**Actively find API contract drift** — not only uncommitted app-service changes. Compare:

| Side | Repo | Branch | Role |
|------|------|--------|------|
| **Backend (source of truth)** | `.` (app-service) | `development` | Routes, controllers, swagger |
| **Mobile client** | `../../mobile/` | `development` | `services/*.ts`, related tests |
| **Partner / admin client** | `../../partner-app/` | `development` | `src/utils/*Api.ts`, `src/types/*`, tests |

Report every mismatch where a client’s paths, methods, request bodies, response shapes, or auth patterns **do not match** what app-service `development` exposes.

## Workflow

```
Client Sync Progress:
- [ ] Step 1: Fetch development on all three repos
- [ ] Step 2: Extract backend contract (app-service development)
- [ ] Step 3: Extract client contracts (mobile + partner development)
- [ ] Step 4: Diff backend vs each client — list drift
- [ ] Step 5: Build contract diff (drift items only)
- [ ] Step 6: Map drift to client files
- [ ] Step 7: Launch api-sync-mobile + api-sync-partner (parallel)
- [ ] Step 8: Summarize for the user
```

---

### Step 1: Fetch development on all three repos

Run from app-service workspace:

```bash
git fetch origin development
git checkout development
git pull origin development

git -C ../../mobile fetch origin development
git -C ../../mobile checkout development
git -C ../../mobile pull origin development

git -C ../../partner-app fetch origin development
git -C ../../partner-app checkout development
git -C ../../partner-app pull origin development
```

If a client repo is missing or not on `development`, note it in the report and skip that client.

Optional: also note recent app-service commits not yet reflected in clients:

```bash
git log origin/development --oneline -20 -- src/routes src/controllers src/config/swagger.ts src/docs src/types src/models src/middleware
```

---

### Step 2: Extract backend contract (app-service development)

Build the **authoritative** contract from `development` (not from local uncommitted edits unless the user is explicitly off-branch).

**Read:**

- `src/config/swagger.ts`
- `src/docs/swagger-*.ts` (if present)
- `src/routes/**`
- `src/controllers/**` (request/response shapes, status codes)
- `src/types/**`, `src/models/**`, validators/schemas if they define API payloads

**Enumerate** every public HTTP endpoint app-service exposes:

| Field | Record |
|-------|--------|
| Method + path | e.g. `POST /api/v1/audiobooks` |
| Path/query params | names, required vs optional |
| Request body | fields and types |
| Response body | fields and wrapper shape |
| Status codes | success + common errors |
| Auth | public, Bearer JWT, roles |

Use swagger as the primary index; **verify against route/controller code** (swagger can be stale — flag gaps in the report).

---

### Step 3: Extract client contracts (mobile + partner development)

On each client’s **`development`** branch, inventory how app-service is called.

**Mobile** (`../../mobile/`):

```bash
rg "'/api/v1/|\"/api/v1/" ../../mobile/services ../../mobile/tests --glob "*.ts"
rg "post<|get<|put<|patch<|delete<" ../../mobile/services/audiobooks.ts ../../mobile/services/userAudiobooks.ts ../../mobile/services/streaming.ts
```

Key files: `services/audiobooks.ts`, `services/userAudiobooks.ts`, `services/api.ts`, `services/moods.ts`, `services/playlists.ts`, `services/favorites.ts`, `services/bookmarks.ts`, `services/notes.ts`, `services/reviews.ts`, `services/comments.ts`, `services/listeningHistory.ts`, `services/location.ts`, related `tests/`.

**Partner / admin** (`../../partner-app/`):

```bash
rg "/api/v1/" ../../partner-app/src ../../partner-app/tests --glob "*.ts"
```

Key files: `src/utils/audiobookApi.ts`, `src/utils/partnerApi.ts`, `src/types/audiobook.ts`, related `tests/`.

For each client call, record: method, path, body fields sent, response type/interface expected, auth mode (Bearer).

---

### Step 4: Diff backend vs each client — find drift

Compare **backend development contract** (Step 2) to **each client development contract** (Step 3).

Flag as drift when:

| Drift type | Example |
|------------|---------|
| **Stale path** | Client calls `/audiobooks`, backend exposes `/api/v1/audiobooks` |
| **Missing client** | Backend added endpoint; no client usage (note as N/A or follow-up) |
| **Ghost client** | Client calls endpoint removed or never existed on backend |
| **Method mismatch** | Client `GET`, backend `POST` |
| **Body mismatch** | Client omits required field (e.g. `owner`), wrong field name |
| **Response mismatch** | Client expects flat shape; backend returns `{ success, data }` wrapper |
| **Auth mismatch** | Client missing Bearer token where backend requires auth |
| **Wrapper mismatch** | Client parses wrong nesting level for `data` |

Classify each item:

- **Breaking for mobile** / **breaking for partner** / **both** / **neither** (backend-only or unused)
- **Fix direction:** update client → match backend (default), unless user says otherwise

If **no drift** in either client, report briefly and **stop** (do not launch sub-agents).

---

### Step 5: Build contract diff

Document **only drift items** using [CONTRACT_TEMPLATE.md](../api-sync/CONTRACT_TEMPLATE.md).

For each item:

- **Before** = what the client does today (development branch)
- **After** = what app-service development requires
- **Breaking:** yes/no
- **Affected app:** mobile | partner | both

Group by endpoint. Include swagger staleness notes if backend code and swagger disagree.

---

### Step 6: Map drift to client files

Use [API_MAP.md](../api-sync/API_MAP.md), then confirm with search:

```bash
rg "endpoint-fragment" ../../mobile/services ../../mobile/tests --glob "*.ts"
rg "endpoint-fragment" ../../partner-app/src ../../partner-app/tests --glob "*.ts"
```

List every file that must change per app before launching sub-agents.

---

### Step 7: Launch sub-agents (parallel)

**Do not** edit client repos yourself. Invoke **api-sync-mobile** and **api-sync-partner** from `.cursor/agents/` in **one message** (parallel). Pass the contract diff and per-app file lists.

```
Use the api-sync-mobile subagent to sync ../../mobile/ (development) with app-service development:
[paste contract diff — mobile items only]
Files to update: [mobile file list]
Direction: align client to backend contract.

Use the api-sync-partner subagent to sync ../../partner-app/ (development) with app-service development:
[paste contract diff — partner items only]
Files to update: [partner file list]
Direction: align client to backend contract.
```

Launch only sub-agents that have drift to fix. Wait for both to finish.

---

### Step 8: Summarize

```markdown
# Client Sync Report

**Backend:** app-service @ `development`
**Mobile:** ../../mobile @ `development`
**Partner:** ../../partner-app @ `development`
**Drift items found:** [count]
**Breaking drift:** [yes/no — list]

## Backend contract source
- Swagger: [up to date | stale — notes]
- Routes scanned: [count]

## Drift summary
| Endpoint | Mobile | Partner | Fix |
|----------|--------|---------|-----|
| ... | drift/none | drift/none | client update |

## Contract changes (detail)
[compact list from Step 5]

## Mobile app
- Status: [completed / failed / skipped — no drift]
- Files updated: [...]
- Tests: [...]

## Partner app
- Status: [completed / failed / skipped — no drift]
- Files updated: [...]
- Tests: [...]

## Follow-up
[Swagger gaps, backend-only endpoints, manual QA]
```

---

## Rules

- User-invoked only — never auto-run.
- **Always compare three `development` branches** — do not stop at “app-service has no local git diff”.
- Backend contract on **app-service `development`** is source of truth; default fix is **update clients**.
- Sub-agents run scoped tests only (never full suites).
- If swagger is stale vs routes, note it in the report; do not update backend unless the user asks.
- Partner app and admin portal are the same repo: `../../partner-app/`.

## Additional resources

- Endpoint → client mapping: [API_MAP.md](../api-sync/API_MAP.md)
- Contract diff template: [CONTRACT_TEMPLATE.md](../api-sync/CONTRACT_TEMPLATE.md)
