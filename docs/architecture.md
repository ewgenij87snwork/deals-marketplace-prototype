# Architecture decisions

## One full-stack Next.js application

Next.js is required and already provides the server boundary. A second backend would duplicate contracts, auth, deployment, and error handling without improving this prototype.

## Persistent relational model

Six models cover the current product: DemoWorkspace, User, BuyerProfile, Asset, ContactRequest, and ModerationAction. There is no generic repository layer, event bus, or speculative messaging model.

## Demo authentication

Each browser gets a signed `httpOnly` cookie containing workspace and active-persona identifiers. The server re-loads the User and never trusts a role supplied by the client. The first persona choice provisions a short-lived workspace; expired workspaces are removed on later provisioning. Workspaces isolate public reviewers from one another without a production identity system.

## Authorization

Every read/mutation resolves the session, checks workspace, role, and participant status, and then performs a bounded Prisma query or transaction. Suspended/removed consequences live in shared policy/query predicates.

## Search and scale

Buyer and Manager discovery lists use bounded pagination and indexed relational filters. Smaller
persona-owned/contact reads have explicit hard caps. If evidence later requires high-volume free
text, PostgreSQL full-text/trigram indexes are the next step—not a search service added in advance.
