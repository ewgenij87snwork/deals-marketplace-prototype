# AI usage and ownership

OpenAI Codex assisted with repository analysis, implementation, test authoring, debugging, and the
final verification pass. Browser checks used the real local and deployed application; code claims
were accepted only when backed by Vitest, Playwright, Prisma, build, audit, or CI evidence.

The owner supplied the product brief, frozen scope, infrastructure choices, and deployment access.
The implementation kept Smart Match and Smart Validation deterministic and inspectable rather than
introducing a runtime LLM dependency.

Material AI suggestions that were rejected or narrowed included a second backend, a generic async
state-machine library, speculative search infrastructure, and a nonce-based CSP system that was not
needed for this bounded prototype. The shipped path remains one Next.js application with scoped
PostgreSQL reads, explicit policy checks, and local UI state.

Final verification is recorded through the repository's consolidated `pnpm verify` gate, the full
Playwright suite, a production dependency audit, CI, and live deployment smoke tests. Private
transcripts, credentials, and shared planning archives are intentionally excluded from source.
