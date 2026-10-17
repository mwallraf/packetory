# Deploy & CI Setup

This project deploys to [Vercel](https://vercel.com) via its native GitHub
integration and is gated by a required CI workflow. There is no deploy step
in `.github/workflows/ci.yml` — Vercel's GitHub App handles production and
preview deployments independently of GitHub Actions.

## 1. Vercel project setup (one-time, human dashboard action)

1. In the Vercel dashboard, create/import a project from this GitHub repo.
2. Go to **Project → Settings → Git** and confirm:
   - **Production Branch** is set to `main`.
   - **Preview Deployments** are enabled for pull requests (this is Vercel's
     default, but confirm it hasn't been disabled).
3. No deploy secrets are stored in this repo — Vercel's GitHub integration
   authenticates via its own GitHub App installation, not a long-lived token
   committed to CI (see threat mitigation T-05-01 in
   `.planning/phases/01-shared-shell-registry/01-05-PLAN.md`).

**Result:** every push to `main` auto-deploys to production, and every PR
gets its own preview deployment URL posted as a PR check/comment.

## 2. Branch protection / merge gate (one-time, human dashboard action)

1. Go to **GitHub → Repo Settings → Branches → Branch protection rules** and
   add a rule for `main` (or edit it via `gh api` if you prefer the CLI).
2. Require the following four status checks to pass before merging
   (QUAL-09's merge gate — all four, not a majority):
   - `typecheck`
   - `lint`
   - `test`
   - `build`
3. The Playwright e2e suites (`test:e2e`, `test:e2e:prod`) are **not** run
   in CI — the job was removed on 2026-10-17 to save GitHub Actions minutes.
   Run both locally (see §4) before merging.
4. Do **not** require the CI workflow's job names loosely — require the
   exact job names above so a renamed/removed job can't silently stop being
   gating.

**Result:** a PR cannot merge into `main` unless all required checks are
green — a single failing check blocks merge regardless of the others'
status or the order they finish in (QUAL-09).

## 3. What the CI workflow does

`.github/workflows/ci.yml` runs on every `pull_request` and every `push` to
`main`. It runs four independent jobs in parallel:

| Job | Command | Gating? |
|-----|---------|---------|
| `typecheck` | `npm run typecheck` | Yes |
| `lint` | `npm run lint` | Yes |
| `test` | `npm run test` | Yes |
| `build` | `npm run build` | Yes |

None of these steps use `continue-on-error` — if any step fails, its job
fails, and the job's required-check status turns red, blocking merge. There
is no path for a failing gating step to report success (QUAL-09).

Actions used (`actions/checkout`, `actions/setup-node`) are pinned to a
fixed major version from trusted (GitHub-owned) publishers, and every job
installs dependencies with `npm ci` against the committed lockfile rather
than `npm install`, so a tampered/loose dependency resolution can't slip
into a green build (threat mitigation T-05-SC).

## 4. Local full-stack run

```bash
npm run dev
```

Starts the Next.js dev server at `http://localhost:3000`. To run the CI
checks plus the local-only e2e suites:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e        # requires: npx playwright install (one-time)
npm run test:e2e:prod   # builds and serves the production build on port 3101
```
