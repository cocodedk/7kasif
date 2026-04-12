# Contributing to 7kasif (Hafte Kasif)

## Local Setup
1. Install Node.js 20+ and Docker.
2. Clone the repository.
3. Install dependencies: `npm install`
4. Start the database: `docker-compose up -d`
5. Install Git hooks (see below).

## Install Git Hooks
```sh
./scripts/install-hooks.sh
```

## Local Git Setup
Run these once after cloning:
```bash
git config pull.rebase true
git config core.autocrlf input
git config push.autoSetupRemote true
git config init.defaultBranch main
```

## Build and Test Commands
```bash
npm run build          # Build all packages
npm run test           # Run all tests
npm run dev:server     # Start server in development mode
npm run dev:client     # Start client in development mode
docker-compose up -d   # Start database and services
docker-compose down    # Stop services
```

## Coding Style
- TypeScript strict mode — no `any` types
- Max 200 lines per file — split by responsibility when approaching limit
- Follow Conventional Commits for all commit messages

## PR Checklist
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual test completed for changed functionality
- [ ] Updated docs if behavior changed

## Branch Naming Conventions

| Branch prefix | Conventional Commit type | Example |
|---|---|---|
| `feature/` | `feat:` | `feature/add-user-auth` |
| `fix/` | `fix:` | `fix/api-crash-on-empty` |
| `chore/` | `chore:` | `chore/update-dependencies` |
| `docs/` | `docs:` | `docs/update-api-guide` |
| `refactor/` | `refactor:` | `refactor/extract-auth-service` |
| `ci/` | `ci:` | `ci/add-dependabot` |

Branch names use **kebab-case**. Never commit directly to `main` — always open a PR.
