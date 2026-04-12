# CLAUDE.md — 7kasif (Hafte Kasif)

## Project Overview

7kasif (Hafte Kasif) is a TypeScript monorepo web application. It consists of three packages: a shared library, a Node.js API server, and a React client. Uses PostgreSQL for data storage and Docker for local development.

- **Language / Runtime**: TypeScript, Node.js 20
- **Framework**: React (client), Express/Node (server)
- **Architecture**: npm workspaces monorepo — packages/shared, packages/server, packages/client
- **Package / Namespace**: `hafte-kasif`

---

## Required Skills — ALWAYS Invoke These

These skills **must** be invoked when the relevant situation arises. Never skip them.

| Situation | Skill |
|-----------|-------|
| Before any new feature or screen | `superpowers:brainstorming` |
| Planning multi-step changes | `superpowers:writing-plans` |
| Writing or fixing core logic | `superpowers:test-driven-development` |
| First sign of a bug or failure | `superpowers:systematic-debugging` |
| Before completing a feature branch | `superpowers:requesting-code-review` |
| Before claiming any task done | `superpowers:verification-before-completion` |
| Working on UI / frontend | `frontend-design:frontend-design` |
| After implementing — reviewing quality | `simplify` |

---

## Architecture

```
7kasif/
├── packages/
│   ├── shared/    <- Shared types, utilities, and contracts
│   ├── server/    <- Node.js API server (Express + PostgreSQL)
│   └── client/    <- React frontend
├── scripts/       <- Development and setup scripts
├── docker-compose.yml    <- Local development services
└── CLAUDE.md      <- This file
```

### Layer Rules
- `packages/client` must never import from `packages/server` directly
- `packages/shared` has no dependencies on server or client
- All cross-package contracts go through `packages/shared`

---

## Coding Conventions

- [ ] All models are **immutable** — use `copy()` / spread for mutations
- [ ] Functions are **pure** where possible — no hidden side effects
- [ ] State is a single source of truth per feature
- [ ] No hardcoded strings — use constants, config, or i18n resources
- [ ] Strict typing everywhere (TypeScript strict mode, no `any`)

---

## Engineering Principles

### File Size
- **200-line maximum per file** — extract a class, function, or module when approaching the limit

### DRY · SOLID · KISS · YAGNI
- Extract shared logic into named utilities; never copy-paste
- Single Responsibility: one class/function does one thing
- Don't add features not yet needed
- Delete dead code immediately

### TDD
- Write the failing test first, make it pass, then refactor
- Test names describe behaviour: `"should reject duplicate email"`
- One assertion per test — keep tests focused and readable

### Commit hygiene
- Follow Conventional Commits: `feat: ...` / `fix: ...` / `chore: ...`
- The `commit-msg` hook enforces this automatically

---

## Build Commands

```bash
npm run build        # Build all packages
npm run test         # Run all tests
npm run dev:server   # Start server in development mode
npm run dev:client   # Start client in development mode
docker-compose up -d # Start database and services
docker-compose down  # Stop services
```

---

## PR Reviews

When reviewing PR comments:
```bash
gh api repos/cocodedk/7kasif/pulls/{number}/comments
gh pr view {number} --json reviews
```

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file — project conventions and session startup |
| `version.txt` | Semantic version (MAJOR.MINOR.PATCH) |
| `packages/shared/` | Shared types and contracts |
| `.github/workflows/` | CI, release, and container automation |
| `.githooks/` | Pre-commit and commit-msg hooks |
| `scripts/install-hooks.sh` | One-time hook installer |

---

## Starting a New Session

1. Read this file
2. Run `npm test` to confirm everything passes
3. Invoke `superpowers:brainstorming` before touching any feature
4. Follow the Required Skills table — every skill is mandatory, not optional
