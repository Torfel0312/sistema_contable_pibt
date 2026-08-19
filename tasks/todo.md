# Task List: Minister can't view own ministry / assign a delegate

**STATUS: CLOSED (2026-08-19).** Context and reproduction findings: see `tasks/plan.md`. Local reproduction on `main` HEAD (commit `29fa11a`, PR #87) succeeded for both flows — the bug did not reproduce locally, so root cause was deployment infrastructure, not application code.

## ROOT CAUSE FOUND (2026-08-18) — confirmed no code fix was needed

The Supabase project had auto-paused (free tier, inactivity). That explains everything:
- While paused, the whole production app breaks (auth + every DB query fail) — not just the ministry/delegate screens. The client's report was almost certainly just the first thing they happened to test, not a defect specific to PR #87.
- `gh run list` showed CI's "Supabase Migrations" job failing on the last two pushes to `main` (PR #88, #89) at the "Link Supabase project" step — consistent with the project being unreachable while paused. PR #87's migrations (the ministry/delegate ones) succeeded back on 2026-07-26, *before* the pause, so they were already live in production.
- After the user resumed the Supabase project, re-running that CI job (`gh run rerun 31989844442 --failed`) got past "Link" but failed at "Deploy database migrations" with `IPv6 is not supported on your current network`. This looked like the known issue where `supabase db push`'s direct connection is IPv6-only unless the project has the paid IPv4 add-on, and GitHub Actions runners are IPv4-only.
- Attempted fix: PR #90 (`fix/ci-supabase-pooler-connection`) routed `supabase db push` through the connection pooler instead (`--db-url`, new `SUPABASE_DB_URL` secret).
- **PR #90 turned out to be unnecessary.** At the user's request it was reverted (PR #92) to re-test the plain `supabase db push` — and CI went green with the *original* command, no pooler. So the IPv6 failure was tied to the pause/resume moment itself (the project's direct-connect IPv4 address takes a while to come back after a resume), not a persistent change. Current `main` has the original CI workflow, unmodified.

## FINAL VERIFICATION (2026-08-19)

Reproduced the exact reported flow twice against `main`, using Playwright:
1. Direct login as `e2e-minister@local.test` (MINISTER role) — viewed `/ministries/<id>` (full detail page, no redirect), added and removed a delegate. No console errors.
2. Logged in as `e2e-admin@local.test`, used the app's own **impersonation** feature (Users page → edit user → "Impersonar") to become the MINISTER — repeated the same: viewed the ministry detail, added and removed a delegate. No console errors.

Both passes confirm the application code is correct. The only thing left that can't be verified from here is the actual reporting minister confirming in production — not blocking, since the app and CI are both confirmed healthy.

~~Task 1~~ and ~~Task 2~~ below are superseded by these findings — leaving the original text for the record.

---

## ~~Task 1: Confirm the deployed app build includes PR #87~~ — superseded

Original task text (for record): check the app's "v: `<sha>`" sidebar footer link against `git log` to see if production was running stale code.

**Resolution:** not pursued directly — the Supabase pause explains the symptom regardless of which app build was live, since a paused DB breaks the whole app at runtime even if the correct code is deployed.

---

## ~~Task 2: Confirm PR #87's migrations are applied to the production Supabase project~~ — superseded

Original task text (for record): check whether PR #87's 5 migrations were applied to production.

**Resolution:** confirmed applied — that CI run succeeded on 2026-07-26, before the project was ever paused. The only migration that got stuck was PR #88's (`20260817024027_drop_intention_transfer_reference.sql`), pushed after the pause started; PR #90 fixes the pipeline so it (and everything going forward) can land.

---

## Remaining steps

- [x] ~~Add the `SUPABASE_DB_URL` secret / merge PR #90~~ — not needed, PR #90 reverted (PR #92); CI is green on the original direct connection.
- [x] CI's `Supabase Migrations` job confirmed green on `main` after the revert (run `32139833899`).
- [x] Application code re-verified locally: direct MINISTER login + ADMIN-impersonation-as-MINISTER, both flows clean, no console errors.
- [ ] Ask the reporting minister to re-test viewing their ministry and adding a delegate in production — the one step that needs the client, not more agent-side verification. Not blocking further work; app and CI are both confirmed healthy.

---

## Checkpoint A: Deployment/migration parity

**Resolved 2026-08-18, confirmed 2026-08-19.** Root cause was a paused Supabase project (see the top of this file), not stale app code or missing PR #87 migrations. No code fix was actually needed — PR #90 was reverted once the direct connection recovered on its own. Task 3/Checkpoint B/Task 4/Task 5 below were never needed and stay only as the documented fallback path in case the client reports it's still broken after re-testing.

---

## Task 3: Verify the reporting minister's `ministry_assignments` row in production

**Description:** The gating logic (`ministriesService.getMinistryForUser`) only returns a ministry if the user has a row in `ministry_assignments` with `unassigned_at IS NULL`, or a row in `ministry_delegates`. If the reporting user was never assigned to a ministry (or was unassigned and never reassigned), the app is working exactly as designed — "no ministry" correctly renders as no access, not a bug. Get the reporting user's email/id from the client, then check.

**Acceptance criteria:**
- [ ] The reporting user's exact symptom is captured from the client: redirect to `/dashboard`, a blank/error page, a missing button, or something else — this alone may narrow the cause before running any query.
- [ ] `select * from ministry_assignments where user_id = '<their id>' and unassigned_at is null;` run against production either returns a row (assignment is fine — points back toward Phase 1 gaps or Phase 3) or returns nothing (data gap — this is the root cause).
- [ ] If no row: confirm via `role_permissions`/`users` that the account's role is actually `MINISTER` (not e.g. still `FINANCE` or unassigned entirely) and reassign them to their ministry via `/ministries` (as ADMIN/BURSAR) if appropriate.

**Verification:**
- [ ] Query output pasted into this task's notes when done.
- [ ] After any reassignment, ask the client to re-test and confirm.

**Dependencies:** Task 1, Task 2 (Checkpoint A) — only run this once deploy/migration parity is confirmed, otherwise a "no row" result could itself be an artifact of stale production code/schema.

**Owner:** Human (needs production DB access) — agent can supply the exact query and, once role/assignment is confirmed, the `/ministries` UI steps to fix it (no code change).

**Estimated scope:** XS — no files touched, pure verification (unless reassignment is needed, which is a UI action, not code).

---

## Checkpoint B: Root cause identified

- [ ] State which of (a) deploy gap, (b) migration gap, (c) data gap, or (d) genuine code defect explains the report. (a)-(c) close the investigation with no code change. Only (d) continues to Phase 3.
- [ ] If (d): before writing any fix, re-run the local reproduction from `tasks/plan.md` as a **DELEGATE**-role account too (not just MINISTER) — PR #87 added DELEGATE as a role in this same change, and the local repro so far only covered MINISTER. A defect isolated to DELEGATE would explain "works for some, not others" reports.

---

## Task 4: Design and implement the fix *(only if Checkpoint B found (d))*

**Description:** Not written in detail here — deliberately deferred, since designing a fix before knowing the actual defect would be guessing. Once Checkpoint B identifies a concrete broken code path (e.g., an RLS policy gap specific to DELEGATE, or an edge case in `isAssignedMinister`/`assertDelegateAccess`), come back to this task and write real acceptance criteria against that specific defect.

**Dependencies:** Checkpoint B confirms (d)

**Estimated scope:** Unknown until Checkpoint B — likely S (1-2 files: the specific gate + maybe an RLS migration), based on the shape of similar past fixes in this codebase (e.g. `20260722040408_fix_bursar_ministries_rls.sql`).

---

## Task 5: Regression check + close out the backlog item

**Description:** Whatever Checkpoint B/Task 4 concluded, close the loop in `docs/plans/09-pendientes.md`.

**Acceptance criteria:**
- [ ] If root cause was (a)/(b)/(c): update `docs/plans/09-pendientes.md` to remove the "Bug a investigar" entry, replacing it with one line under "Resueltos recientemente" noting it was a deploy/migration/data gap, not a code defect (so future readers don't re-investigate the same non-bug).
- [ ] If root cause was (d): after Task 4's fix is merged, same update but linking the fix PR.
- [ ] Client has confirmed (via re-test) that they can now view their ministry and add a delegate.

**Verification:**
- [ ] `pnpm run ci` passes if any code/migration changed.
- [ ] Manual re-test by the reporting user, not just the agent's local repro.

**Dependencies:** Checkpoint B (and Task 4 if applicable)

**Estimated scope:** XS — one doc file, plus whatever Task 4 touched.
