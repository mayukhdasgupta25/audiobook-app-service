# User Subscriptions — Clarifications Needed Before Implementation

> Tracking issue: Slack request "Implement feature to create and manage user
> subscriptions".
> Branch: `cursor/coding-choice-clarifications-3c36`.
>
> Before writing any code I'd like to lock down the choices below. Each
> section lists the decision point, the reasonable options I see given the
> current codebase, and (where useful) my default recommendation. Please
> answer inline or in the Slack thread and I'll proceed with the
> implementation.

---

## 1. Product / Business Rules

1.1 **Subscription tiers** — what does the catalogue look like?
   - (a) Single paid tier (e.g. "Premium") + implicit free tier, or
   - (b) Multiple tiers (e.g. Basic / Premium / Family), or
   - (c) Configurable plans stored in the DB so admins can add/edit them
     without a deploy?
   - *Default recommendation:* (c) — a `SubscriptionPlan` table seeded with
     one Premium plan, so we don't have to ship code changes when pricing
     or perks change.

1.2 **Billing cycles** — monthly only, or also yearly/quarterly/lifetime?
   Should a single plan support multiple cycles (e.g. monthly vs yearly
   price for the same "Premium" plan) or are those separate plans?

1.3 **Entitlements** — what does an active subscription actually unlock?
   The codebase already has `AudioBook.isPublic`, `OfflineDownload`,
   chapter streaming, etc. Candidates:
   - access to non-public audiobooks,
   - offline download permission (currently anyone can hit
     `OfflineDownloadController`),
   - removal of ads / time limits,
   - higher quality streams.
   I need an explicit list so I can wire the right authorization checks.

1.4 **Trial period** — free trial supported? If so, length, one-per-user,
   and is a payment method required up-front?

1.5 **Cancellation behaviour**:
   - (a) cancel immediately and refund pro-rata, or
   - (b) "cancel at period end" (most common, simpler) — access continues
     until `currentPeriodEnd`, no auto-renew?
   - *Default recommendation:* (b).

1.6 **Grace period on failed payment** — how many days of `PAST_DUE`
   before we flip the user to `EXPIRED`? Stripe default is 3 retries over
   ~3 weeks; do we want to mirror that or pick our own number?

1.7 **One subscription per user at a time, or stackable?** Most audiobook
   apps enforce one active subscription per user; please confirm.

---

## 2. Payment Provider

2.1 **Which provider?** The default language in `schema.prisma` is `bn`
   (Bangla) which suggests a Bangladesh-first audience. Options:
   - Stripe (global, dev-friendly, no native BDT card-acquiring in BD),
   - SSLCOMMERZ / bKash / Nagad / Rocket (local BD gateways),
   - Apple/Google in-app purchase (if a mobile app is the primary client),
   - "Mock" provider only for now (admin manually marks user as paid),
   - Multiple at once via a `provider` enum on `Subscription`.
   - **This single choice has the biggest impact on schema + webhook
     code, so please answer first.**

2.2 **Source of truth for billing state** — does the provider own the
   subscription lifecycle (we just mirror it from webhooks) or do we
   schedule renewals ourselves using Bull (`bull` is already installed)?
   - *Default recommendation:* provider-owned (webhook → upsert our row),
     because reinventing dunning is painful.

2.3 **Webhook endpoint** — confirm I should:
   - expose it under `/api/v1/subscriptions/webhook/:provider`,
   - skip `authenticateJWT` for it (it lives under `/v1` which currently
     applies JWT to everything — I'd lift it out or add a per-route
     bypass),
   - verify signatures using a secret in `.env`,
   - implement idempotency via an `event_id` unique constraint on a
     `WebhookEvent` table.

2.4 **Stored payment data** — agreement that we will *never* store raw
   PANs and will only persist provider customer/subscription IDs +
   last-4/brand metadata? (Avoids PCI scope.)

2.5 **Refunds** — out of scope for v1 (admin issues via provider
   dashboard), or do we need an admin endpoint?

---

## 3. Data Model (Prisma)

Below is my proposed shape; please flag changes.

```prisma
model SubscriptionPlan {
  id            String   @id @default(cuid())
  code          String   @unique          // e.g. "premium_monthly"
  name          String
  description   String?
  priceCents    Int
  currency      String                    // ISO 4217, e.g. "BDT"
  interval      BillingInterval           // MONTH | YEAR | ...
  intervalCount Int      @default(1)
  trialDays     Int?
  isActive      Boolean  @default(true)
  providerRefs  Json?                     // { stripe: "price_..." }
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  subscriptions Subscription[]
}

model Subscription {
  id                   String   @id @default(cuid())
  userProfileId        String
  planId               String
  status               SubscriptionStatus // TRIALING | ACTIVE | PAST_DUE | CANCELED | EXPIRED | INCOMPLETE
  provider             PaymentProvider    // STRIPE | SSLCOMMERZ | MANUAL | ...
  providerCustomerId   String?
  providerSubscriptionId String?  @unique
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean  @default(false)
  canceledAt           DateTime?
  trialEndsAt          DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  userProfile          UserProfile @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  plan                 SubscriptionPlan @relation(fields: [planId], references: [id])
  invoices             SubscriptionInvoice[]
  @@index([userProfileId, status])
}

model SubscriptionInvoice {
  id                String   @id @default(cuid())
  subscriptionId    String
  providerInvoiceId String?  @unique
  amountCents       Int
  currency          String
  status            InvoiceStatus  // PAID | OPEN | FAILED | REFUNDED
  paidAt            DateTime?
  createdAt         DateTime @default(now())
  subscription      Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
}

model WebhookEvent {
  id          String   @id @default(cuid())
  provider    PaymentProvider
  externalId  String
  type        String
  payload     Json
  receivedAt  DateTime @default(now())
  processedAt DateTime?
  @@unique([provider, externalId])
}
```

3.1 Do you want **subscription history** preserved (i.e. a user can have
   many `Subscription` rows over time, only one ACTIVE), or should we
   reuse a single row and mutate it? *Recommendation:* keep history.

3.2 Should `UserProfile` get a denormalised `currentSubscriptionId` /
   `subscriptionStatus` for fast reads, or always join? *Recommendation:*
   add a generated view / a simple cached lookup but not denormalise in
   the table for v1.

3.3 OK to add a `PaymentProvider` enum even if we only ship one provider
   first? (Future-proofing.)

3.4 Naming — the existing convention is `@@map("snake_case")`; I'll
   follow it (`subscription_plans`, `subscriptions`, `subscription_invoices`,
   `webhook_events`). Confirm.

3.5 Migration vs `db push` — existing migrations live in
   `prisma/migrations/`. I'll generate a proper migration with
   `prisma migrate dev --name add_user_subscriptions`. Confirm.

3.6 Seed data — should `prisma/seed.ts` create a default `Premium`
   plan?

---

## 4. API Surface

Proposed endpoints (all under `/api/v1`, JWT-protected unless noted):

| Method | Path                                  | Auth         | Purpose |
| ------ | ------------------------------------- | ------------ | ------- |
| GET    | `/subscription-plans`                 | user/admin   | list active plans |
| POST   | `/subscription-plans`                 | admin        | create plan |
| PUT    | `/subscription-plans/:id`             | admin        | update plan |
| DELETE | `/subscription-plans/:id`             | admin        | soft-delete (set `isActive=false`) |
| GET    | `/subscriptions/me`                   | user/admin   | current user's active subscription + history |
| POST   | `/subscriptions`                      | user/admin   | start checkout for `{ planId }` → returns provider checkout URL / client secret |
| POST   | `/subscriptions/:id/cancel`           | user/admin   | request cancellation (at period end by default) |
| POST   | `/subscriptions/:id/resume`           | user/admin   | undo a scheduled cancellation |
| GET    | `/admin/subscriptions`                | admin        | paginated list of all subscriptions w/ filters |
| POST   | `/subscriptions/webhook/:provider`    | **public**   | provider webhook receiver (signature-verified) |

4.1 Happy with this surface? Anything to add (e.g. an admin "grant free
   subscription" endpoint, an "upgrade/downgrade plan" endpoint)?

4.2 For the "start checkout" flow, do we want:
   - (a) backend creates the provider checkout session and returns a URL
     (server-driven, simplest), or
   - (b) backend returns a client secret and the mobile/web client
     drives the SDK?
   *Default recommendation:* (a).

4.3 Should I introduce a new role middleware `requireActiveSubscription`
   to gate premium endpoints (e.g. `OfflineDownloadController`,
   non-public audiobook reads), or is that out-of-scope for this PR and
   handled in a follow-up? *Recommendation:* land the middleware now but
   only apply it to one obvious endpoint as a demonstration to keep the
   PR reviewable.

---

## 5. Authorization & Existing Middleware

5.1 Confirm existing patterns are the right ones to reuse:
   - `authenticateJWT` (already applied globally under `/v1`),
   - `requireUserOrAdmin()` / `requireAdmin()` from `RoleMiddleware`,
   - `ValidationMiddleware.validateId` / `validatePagination`,
   - `ResponseHandler` for success/error responses,
   - `MessageHandler` + `src/config/messages.yaml` for response strings,
   - `ErrorHandler.asyncHandler` wrapping each controller method.
   I'll mirror the `AudioBookController` structure for the new
   `SubscriptionController` / `SubscriptionPlanController`.

5.2 The webhook route needs to bypass `authenticateJWT`. The cleanest
   way given the current `ApiRouter` is to mount the webhook router
   *before* the `v1Router.use(authenticateJWT)` line, on a dedicated
   sub-path like `/v1/subscriptions/webhook`. OK with that approach, or
   prefer keeping it under `/v1` and special-casing it inside the auth
   middleware?

---

## 6. Background Jobs / Events

6.1 **RabbitMQ vs Bull** — the codebase has both: RabbitMQ is used for
   user lifecycle events (see `004c308 User profile may now receive
   firstName and lastName from rabbitMQ`), Bull is used for queue/worker
   processing. For subscription events I propose:
   - Bull queue `subscription-jobs` for scheduled tasks (e.g. mark
     expired subs daily at 00:05),
   - Publish RabbitMQ events `subscription.created`, `subscription.canceled`,
     `subscription.payment_failed` so other services (e.g. notification
     service) can react.
   Confirm or simplify.

6.2 **Notifications** — out of scope for this PR (we just emit the
   RabbitMQ events and let a separate service send the email/push),
   correct?

---

## 7. Observability, Validation, Testing

7.1 Logging: keep using `pino` via the existing `logger` config — confirm
   no new fields required (I'll add `subscriptionId` to log context where
   relevant).

7.2 Validation: stick with the existing manual `ValidationMiddleware`
   style, or is now the time to introduce `zod` / `joi`? The current code
   has zero schema-validation library, so I'll stay manual unless told
   otherwise.

7.3 Tests: minimum bar for this PR — unit tests for `SubscriptionService`
   (status transitions, period rollover, idempotent webhook handling)
   and integration tests for the routes using the same Jest setup as
   today? Anything stricter?

7.4 Swagger: I'll add JSDoc blocks on every new route mirroring
   `audioBookRoutes.ts`, and component schemas in `swagger.ts`. Confirm.

7.5 ESLint / TS strictness: I'll match existing conventions (no `any`,
   explicit return types on public methods). The repo has had recent
   "fix-linting-errors" PRs, so I'll run `npm run lint` before pushing.

---

## 8. Env / Secrets

I'll need at least these new env vars (names depend on provider chosen
in §2.1). Confirm I should add them to `.env.example`:

```
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=          # if client-driven flow
SUBSCRIPTION_DEFAULT_CURRENCY=BDT
SUBSCRIPTION_GRACE_PERIOD_DAYS=3
```

Are the actual secret values going to be added in the Cursor Dashboard
(Cloud Agents > Secrets) so the agent can run integration tests against
sandbox, or should I mock the provider entirely in tests?

---

## 9. Scope of the First PR

To keep the change reviewable I'd suggest splitting into PRs:

1. **PR 1 (this branch):** schema + migration + `SubscriptionPlan` CRUD
   (admin) + `GET /subscriptions/me` + webhook scaffolding with a
   `MANUAL` provider only (admin endpoint to grant/cancel). No real
   payment integration yet.
2. **PR 2:** real provider integration (Stripe or chosen one) +
   checkout + webhook handlers + Bull jobs.
3. **PR 3:** apply `requireActiveSubscription` to entitlement-gated
   endpoints + RabbitMQ events + notification hooks.

Is that staging acceptable, or do you want it all in one PR?

---

### TL;DR — the smallest set of answers that unblocks me

If you can only answer five things, please answer:

1. §1.3 — what does a subscription unlock?
2. §1.5 — cancel-immediately vs cancel-at-period-end?
3. §2.1 — which payment provider (or "mock only for now")?
4. §3 — is the proposed schema acceptable?
5. §9 — single PR or staged PRs?

I'll proceed with the defaults noted above for any question that isn't
answered within the next iteration.
