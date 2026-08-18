# Implementation Plan: Minister can't view own ministry / assign a delegate

## Overview

`docs/plans/09-pendientes.md` records a client-reported bug (2026-08-17): a MINISTER user can't view their own ministry's detail page or assign a delegate. PR #87 (merged into `main` on 2026-07-26) added exactly this capability — `isAssignedMinister` in `app/(dashboard)/ministries/[id]/page.tsx` and `assertDelegateAccess` in `app/actions/ministries.ts`.

**Reproduction attempt (done during planning, not a task below):** logged in locally as the seeded `e2e-minister@local.test` account (role MINISTER) against `main` @ current HEAD (commit `29fa11a`, PR #87's squash-merge) and walked both flows end-to-end via the real browser (not a mock):
- Clicked "Ministerio: Ministerio E2E" from `/requests` → landed on `/ministries/<id>` with the full ministry detail page rendered (no redirect, no error) — "Ministro asignado", "Delegados" section with an enabled "Agregar delegado" button, assignment history, requests, movimientos, remanente all visible.
- Clicked "Agregar delegado", filled the form, submitted → a new delegate row appeared immediately ("Delegado Verificacion Plan"), then removed it via "Quitar delegado" — both actions completed with no console errors.

**Conclusion: the code on `main` works correctly for both flows.** This does not disprove the client's report — it relocates the likely root cause away from "PR #87's application code is wrong" and toward one of: (a) production isn't running PR #87's code yet, (b) production's Supabase project is missing PR #87's migrations (RLS policies / `ministry_delegates` table), or (c) the specific reporting user's `ministry_assignments` row doesn't say what we assume (never assigned, or unassigned).

The plan below is an **investigation**, not a feature build — most tasks are diagnostic and gate whether any code change is needed at all. Do not write a fix before Checkpoint A confirms what's actually broken.

## Architecture Decisions

- No code changes are planned until root cause is confirmed — implementing a "fix" for unreproduced behavior risks masking the real gap (most likely a deploy/migration gap, which no application code change would touch).
- Diagnostic tasks are ordered cheapest/most-likely-first: deployment mismatch and migration drift are checked before touching the reporting user's specific data, which is checked before re-auditing application code that has already been reproduced as working.

## Task List

### Phase 1: Confirm what's actually running in production

- [ ] Task 1: Confirm the deployed app build includes PR #87
- [ ] Task 2: Confirm PR #87's migrations are applied to the production Supabase project

### Checkpoint A: Deployment/migration parity
- [ ] Either a gap was found and fixed here (redeploy / apply migrations), in which case ask the client to re-test before continuing — **or** production is confirmed at parity with `main`, in which case proceed to Phase 2.

### Phase 2: Confirm the reporting user's data state (only if Checkpoint A found no gap)

- [ ] Task 3: Verify the reporting minister's `ministry_assignments` row in production

### Checkpoint B: Root cause identified
- [ ] State exactly one of: (a) deploy/migration gap — resolved in Phase 1, (b) data gap — this user was never assigned / was unassigned, resolved by re-assigning via `/ministries`, (c) genuine code defect not caught by local reproduction — only then proceed to Phase 3.

### Phase 3: Fix (only if Checkpoint B found a genuine code defect)

- [ ] Task 4: Design and implement the fix, scoped to whatever Checkpoint B actually surfaced
- [ ] Task 5: Regression check + close out the backlog item

### Checkpoint C: Closed out
- [ ] `docs/plans/09-pendientes.md`'s "Bug a investigar" entry is either removed (root cause was deploy/data, not code — noted as resolved without a code change) or replaced with a link to the merged fix PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent has no access to the production Supabase project or hosting dashboard | High — Tasks 1–3 can't be executed by the agent alone | Each task below is explicit about what info/access is needed from the human; the agent can prepare exact commands/queries to run |
| The reporting user's exact symptom (redirect? blank page? error toast? missing button?) isn't captured anywhere | Medium — without it, "confirmed fixed" is unverifiable | Task 3 includes asking the client for the precise symptom and a screenshot if possible, before declaring any checkpoint closed |
| A real code defect exists but only manifests for the DELEGATE role, or a role/permission edge case not covered by the local MINISTER repro | Medium | If Phase 1–2 clear production, add a second local repro pass specifically as a DELEGATE-role account before concluding Phase 3 isn't needed |

## Open Questions

- What hosting platform serves production, and who has access to its deploy history / env vars? (Not documented anywhere in this repo — needed for Task 1.)
- Does anyone have direct access to the production Supabase project (dashboard or `SUPABASE_ACCESS_TOKEN`) to run Task 2's migration-parity check and Task 3's data query? `pnpm supabase migration list --linked` requires a linked project.
- What exactly did the reporting minister see — a redirect to `/dashboard`, a blank/broken page, a permission error, or just a missing "Agregar delegado" button? This changes which task in Phase 1–2 is most likely to explain it.
