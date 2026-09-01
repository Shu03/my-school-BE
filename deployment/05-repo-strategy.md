# 05 · Repo Strategy — Separate vs Monorepo

Today the code lives in **two separate repositories** (`my-school-BE`, `my-school-FE`).
This chapter lays out the trade-offs so you can decide consciously; the guide works
with either choice.

---

## Option 1 — Two separate repos (current, recommended)

```
my-school-BE/   → deploys to the API host
my-school-FE/   → deploys to the static host
```

**Pros**
- Independent deploys and rollbacks (ship FE without touching BE).
- Simpler CI: each repo's pipeline only builds one thing.
- Cleaner access control and smaller clones.
- Matches how the hosts think (FE host watches FE repo, API host watches BE repo).

**Cons**
- Cross-cutting changes (e.g. an API contract change) span two PRs.
- No shared types package unless you publish one.
- Two sets of CI config to maintain.

**Best for:** demos, small teams, and this project as-is.

---

## Option 2 — Monorepo (single repo, two apps)

```
my-school/
├── apps/
│   ├── api/   (NestJS)
│   └── web/   (React + Vite)
├── packages/
│   └── shared/  (optional: shared TS types, e.g. API DTOs)
└── package.json (pnpm workspace)
```

**Pros**
- One PR can change API + client together (atomic contract changes).
- Share a `packages/shared` type package between BE and FE.
- Single source of truth, one CI config, one issue tracker.

**Cons**
- Requires restructuring both existing repos + git history decisions.
- CI must build **only what changed** (path filters) or you rebuild everything.
- Some hosts need a configured "root directory" to find each app.

**Best for:** teams that frequently change the API contract and want shared types.

---

## Deploying a monorepo (if you choose it)

Every platform supports monorepos via a **root/base directory** setting:

| Platform | Setting |
| -------- | ------- |
| Render | "Root Directory" per service (`apps/api`, `apps/web`) |
| Railway | Service "Root Directory" |
| Vercel | Project "Root Directory" = `apps/web` |
| Netlify | "Base directory" = `apps/web` |
| Fly.io | `fly.toml` in `apps/api`, run `fly deploy` from there |
| Cloud Run / ECS | Docker build context set to the app subfolder |

**pnpm workspace** `package.json` (root):

```json
{
  "name": "my-school",
  "private": true,
  "packageManager": "pnpm@9",
  "workspaces": ["apps/*", "packages/*"]
}
```

Build only the changed app in CI with path filters (see
[Chapter 08 · CI/CD](08-cicd.md)).

---

## Recommendation

> **Keep the two separate repos.** For a demo/MVP the operational simplicity wins, and
> nothing in this guide requires a monorepo. Revisit a monorepo only if you start
> sharing types or making frequent coupled API+UI changes.

Continue to [Chapter 06 · Free-Tier Deployment](06-free-tier.md).
