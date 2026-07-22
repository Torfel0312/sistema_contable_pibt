# Users page: group-by-role view toggle

## Problem

The Users page (`/users`, `components/users/users-manager.tsx`) currently only
offers a flat list with a name/email search box. A design mockup (Claude
Design project, "Holly Money Redesign") adds a "Por rol / Lista" segmented
toggle that switches between:

- **Lista** — today's flat list of users, unchanged.
- **Por rol** — the same users grouped into collapsible sections by role
  (`ADMIN`, `BURSAR`, `FINANCE`, `MINISTER`), each with a role-colored dot,
  label, member count badge, and a chevron to collapse/expand the section.

This is a display/organization feature, not a single-role filter — all roles
remain visible in both views.

## Scope

Client-side only, contained to `components/users/users-manager.tsx`. No new
routes, no server/API changes, no schema changes. Labels and copy follow the
pasted design exactly (Spanish UI text, existing role labels: Administrador,
Tesorero, Finanzas, Ministro).

## Behavior

### View mode

- New state: `viewMode: "grouped" | "flat"`.
- Initialized from `localStorage.getItem("users-view-mode")`; defaults to
  `"grouped"` if unset or invalid.
- Persisted to `localStorage` whenever it changes.
- Rendered as a two-button pill toggle (icons: `layout-list` for "Por rol",
  `list` for "Lista"), placed on the same row as the existing
  "N integrantes" count line, right-aligned. Active button gets a raised
  surface background; inactive button is transparent. Matches the design's
  `background: surface-muted; border-radius: 11px; padding: 2px` container.

### Grouping

- Groups are derived from the existing `filtered` array (already filtered by
  the search box), via a `useMemo`.
- Fixed role order: `ADMIN`, `BURSAR`, `FINANCE`, `MINISTER` — matches the
  order already used in the permissions matrix and role selects elsewhere in
  the app.
- A role's group is omitted entirely from the grouped view if it has zero
  matching members (e.g., search excludes all members of that role, or no
  user has that role).
- Each group's label/badge color reuses the existing `roleLabel` and
  `roleBadgeVariant` helpers already defined in this file — no new color
  mapping.

### Collapse state

- New state: `collapsedRoles: Set<UserRole>`.
- Starts empty (all groups expanded by default) and is **not** persisted
  across page loads — resets to fully expanded each time the page mounts.
- Toggling a group's header adds/removes that role from the set.

### Search interaction

- The search box behavior is unchanged — it continues to filter the
  underlying `users` array into `filtered` by name/email substring match.
- In grouped view, `filtered` is what gets bucketed by role, so typing a
  search term narrows each group's members and can cause whole groups to
  disappear if none of their members match. No mode-switching side effects.

### Row rendering

- The existing per-user row markup (avatar, name, email, role/status badges,
  impersonate button, edit button, click-to-open-edit-dialog) is extracted
  into one local render function used by both the flat list and each group's
  member list, so there is exactly one copy of that JSX.
- Existing empty states (`users.length === 0` and `filtered.length === 0`)
  keep their current behavior and copy, unaffected by `viewMode`.

## Out of scope

- No server-side sorting/filtering changes.
- No persistence of collapse state.
- No changes to the create/edit/delete/impersonate/reset dialogs or their
  logic.
- No single-role filter dropdown (explicitly ruled out during design
  discussion — the toggle only changes grouping, not which roles are shown).

## Testing

Manual verification via `pnpm dev`: toggle between views, collapse/expand a
group, search with each view active, reload the page to confirm the view
mode persists via localStorage and collapse state resets.
