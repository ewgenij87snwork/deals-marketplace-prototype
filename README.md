# N5Deal Marketplace Prototype

> A fictional, reviewer-friendly M&A marketplace demonstrating Buyer, Seller, and Platform Manager flows in one persistent Next.js application.

**Live application:** [n5deal-marketplace-prototype-six.vercel.app](https://n5deal-marketplace-prototype-six.vercel.app)

**Production branch:** `integration/n5deal-prototype` — the exact deployed SHA is exposed by [`/api/health`](https://n5deal-marketplace-prototype-six.vercel.app/api/health)

## Two-minute reviewer tour

1. Open the live application and continue as **Buyer**.
2. Update the acquisition mandate, filter Assets, open one match explanation, and contact a Seller.
3. Switch to **Seller**, publish an Asset, select it as context, filter Buyers, and contact one.
4. Switch to **Platform Manager**, filter participants, preview the impact of suspension, suspend the Seller, and confirm the Seller's Assets disappear from the Buyer marketplace.
5. Hard-refresh after mutations to verify persistence.

All people, companies, Assets, prices, and communications are fictional.

## Why this scope

The assignment evaluates product interpretation and engineering decisions, not feature count. The prototype focuses on the central marketplace loop:

```text
Buyer mandate ↔ Asset facts ↔ explainable fit ↔ persisted inquiry
                              ↓
                    participant moderation
```

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + small shadcn/Radix primitives
- Prisma + PostgreSQL
- Vitest + Testing Library + Playwright
- Vercel

## Architecture

One Next.js application owns UI, server reads/mutations, policy, and persistence. PostgreSQL is the source of truth. A signed `httpOnly` cookie points to an isolated fictional workspace and active persona; every query is scoped by the server-resolved workspace/user/status.

See [`docs/architecture.md`](docs/architecture.md).

## Smart product features

- **Explainable Smart Match:** deterministic, tested fit + confidence + reasons for Buyer→Asset and Seller Asset→Buyer discovery.
- **Smart Validation:** catches contradictory acquisition criteria and low-quality/incomplete Asset data.

These features remain useful without an external AI provider. AI development tools and human judgment are documented in [`docs/ai-usage.md`](docs/ai-usage.md).

## Local launch

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Open `http://localhost:3002`.

## Verification

```bash
pnpm verify
pnpm test:e2e
```

`pnpm verify` is the consolidated project-policy, lint, format, type, unit/integration,
production-build, and diff gate. The Playwright release suite exercises real desktop/mobile
scenarios across Buyer, Seller, Platform Manager, recovery, security, and responsive states.

## Assumptions

- Demo personas are intentional prototype authentication, not production identity.
- Contact is a persisted marketplace inquiry, not realtime chat/email.
- Removal is soft and auditable.
- Money is normalized to integer EUR.
- No real/confidential deal data should be entered.

## Edge cases handled

- duplicate Asset title;
- duplicate Contact submission;
- self-contact;
- target suspended/removed between dialog open and submit;
- Seller suspension hides published Assets and blocks new Contact;
- cross-workspace guessed IDs;
- invalid URL filters;
- distinct zero-result/zero-inventory, loading, recoverable network, and unavailable states;
- stale/missing sessions and wrong-role routes;
- concurrent workspace capacity and duplicate-publication races.

## With more time

1. real organization authentication and invitations;
2. role/permission management;
3. secure data-room and NDA workflow;
4. richer messaging/notifications;
5. normalized high-cardinality taxonomies and full-text search;
6. optional multilingual UI and carefully bounded LLM assistance.

## Stop the public demo

After review, set `DEMO_MODE_ENABLED=false` and redeploy, enable deployment protection, or remove the Vercel/database projects.

## Known limitations

- Authentication is an intentionally signed, isolated demo workspace rather than real organization identity.
- Demo workspaces expire after 24 hours and production creation is capped at 40 active workspaces.
- Contact is persisted in-app; the prototype does not send email or realtime notifications.
- The free hosting/database tiers can cold-start after inactivity and are not an availability SLA.
- The GitHub repository must be made public separately before assignment submission if the reviewer
  is expected to access source without an invitation.
- No real or confidential deal data should be entered.
