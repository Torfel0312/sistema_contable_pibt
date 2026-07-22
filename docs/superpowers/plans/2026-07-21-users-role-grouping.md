# Users Role-Grouping View Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Por rol / Lista" segmented toggle to the Users page (`/users`) that switches between the existing flat user list and a new view that groups users into collapsible sections by role.

**Architecture:** All changes are contained to `components/users/users-manager.tsx` (client component, no server/API/schema changes). The per-user row markup is first extracted into a small `UserListItem` component to avoid duplicating it between the flat and grouped views. Then a `viewMode` state (persisted to `localStorage`) and a `collapsedRoles` state (not persisted) drive which of the two renderings is shown, both built from the same `filtered` (search-matched) array.

**Tech Stack:** Next.js 16 App Router, React (Client Component), TypeScript strict, Tailwind CSS v4, lucide-react icons, existing `Item`/`ItemGroup`/`Badge` UI primitives from `components/ui/`.

## Global Constraints

- Always use `pnpm`, never `npm`/`yarn`.
- No semicolons, double quotes, `printWidth` 100, no trailing commas (`.prettierrc`).
- All identifiers/variable names: English. UI text shown to users: Spanish, matching the design's exact copy ("Por rol", "Lista", "N integrante(s)").
- `pnpm run ci` (lint + typecheck) must pass before each commit.
- No new files beyond what's listed per task — this stays a single-component change.
- Reuse the existing `roleLabel`, `roleBadgeVariant`, `statusMeta`, `isLinkExpired` helpers already defined in `components/users/users-manager.tsx` — do not redefine them.
- No jest test coverage exists for any `.tsx` component in this codebase (verified: `find components -iname "*.test.tsx"` returns nothing) — verification for both tasks is `pnpm typecheck && pnpm lint` plus manual browser check via `pnpm dev`, matching the project's established pattern for UI-only changes (see `docs/superpowers/plans/2026-07-08-inbound-email-routing.md`, Task 7).

---

### Task 1: Extract `UserListItem` (pure refactor, no behavior change)

**Files:**
- Modify: `components/users/users-manager.tsx:111` (insert new component just before this line)
- Modify: `components/users/users-manager.tsx:609-678` (replace inline row rendering with `UserListItem` usage)

**Interfaces:**
- Consumes: `UserRow` type, `statusMeta`, `isLinkExpired`, `roleBadgeVariant`, `roleLabel` (all already defined above line 111 in this file), `avatarColorFor`/`initialsFor` from `@/lib/utils` (already imported), `Item`/`ItemContent`/`ItemTitle`/`ItemDescription`/`ItemActions`/`Badge`/`Button` (already imported), `VenetianMask`/`Settings2` icons (already imported).
- Produces: `function UserListItem(props: { user: UserRow; onOpen: () => void; onImpersonate: () => void }): JSX.Element` — a module-scope component in the same file, consumed by Task 2.

- [ ] **Step 1: Insert the `UserListItem` component**

In `components/users/users-manager.tsx`, immediately above the line `export function UsersManager({ initialUsers }: { initialUsers: UserRow[] }) {` (currently line 111), insert:

```tsx
function UserListItem({
  user,
  onOpen,
  onImpersonate
}: {
  user: UserRow
  onOpen: () => void
  onImpersonate: () => void
}) {
  const meta = statusMeta(user.status)
  const linkExpired = isLinkExpired(user)
  return (
    <Item
      variant="outline"
      onClick={onOpen}
      className={cn("cursor-pointer rounded-[14px] px-[18px]", meta.rowOpacity && "opacity-55")}
    >
      <div
        className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] text-[13px] font-extrabold text-white"
        style={{ background: avatarColorFor(user.full_name || user.email) }}
      >
        {initialsFor(user.full_name || "?")}
      </div>
      <ItemContent>
        <ItemTitle className="font-bold">{user.full_name}</ItemTitle>
        <ItemDescription className="text-[12.5px]">{user.email}</ItemDescription>
        <div className="sm:hidden mt-0.5 flex flex-wrap gap-1">
          {meta.variant && <Badge variant={meta.variant}>{meta.label}</Badge>}
          {linkExpired && <Badge variant="expense">Enlace expirado</Badge>}
        </div>
      </ItemContent>
      <ItemActions>
        <Badge variant={roleBadgeVariant(user.role)} className="hidden sm:inline-flex">
          {roleLabel(user.role)}
        </Badge>
        {meta.variant && (
          <Badge variant={meta.variant} className="hidden sm:inline-flex">
            {meta.label}
          </Badge>
        )}
        {linkExpired && (
          <Badge variant="expense" className="hidden sm:inline-flex">
            Enlace expirado
          </Badge>
        )}
        {user.role !== "ADMIN" && user.status === "ACTIVE" && (
          <Button
            size="icon-sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onImpersonate()
            }}
            title="Impersonar"
          >
            <VenetianMask className="size-3.5" />
          </Button>
        )}
        <Button size="icon-sm" variant="outline" onClick={onOpen} title="Editar usuario">
          <Settings2 className="size-3.5" />
        </Button>
      </ItemActions>
    </Item>
  )
}

```

- [ ] **Step 2: Replace the inline row rendering with `UserListItem`**

Find this exact block (currently `components/users/users-manager.tsx:609-678`, the final branch of the `users.length === 0 ? ... : filtered.length === 0 ? ... : (...)` ternary):

```tsx
      ) : (
        <ItemGroup>
          {filtered.map((user) => {
            const meta = statusMeta(user.status)
            const linkExpired = isLinkExpired(user)
            return (
              <Item
                key={user.id}
                variant="outline"
                onClick={() => openEdit(user)}
                className={cn(
                  "cursor-pointer rounded-[14px] px-[18px]",
                  meta.rowOpacity && "opacity-55"
                )}
              >
                <div
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] text-[13px] font-extrabold text-white"
                  style={{ background: avatarColorFor(user.full_name || user.email) }}
                >
                  {initialsFor(user.full_name || "?")}
                </div>
                <ItemContent>
                  <ItemTitle className="font-bold">{user.full_name}</ItemTitle>
                  <ItemDescription className="text-[12.5px]">{user.email}</ItemDescription>
                  <div className="sm:hidden mt-0.5 flex flex-wrap gap-1">
                    {meta.variant && <Badge variant={meta.variant}>{meta.label}</Badge>}
                    {linkExpired && <Badge variant="expense">Enlace expirado</Badge>}
                  </div>
                </ItemContent>
                <ItemActions>
                  <Badge variant={roleBadgeVariant(user.role)} className="hidden sm:inline-flex">
                    {roleLabel(user.role)}
                  </Badge>
                  {meta.variant && (
                    <Badge variant={meta.variant} className="hidden sm:inline-flex">
                      {meta.label}
                    </Badge>
                  )}
                  {linkExpired && (
                    <Badge variant="expense" className="hidden sm:inline-flex">
                      Enlace expirado
                    </Badge>
                  )}
                  {user.role !== "ADMIN" && user.status === "ACTIVE" && (
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImpersonate(user.id)
                      }}
                      title="Impersonar"
                    >
                      <VenetianMask className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => openEdit(user)}
                    title="Editar usuario"
                  >
                    <Settings2 className="size-3.5" />
                  </Button>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      )}
```

Replace it with:

```tsx
      ) : (
        <ItemGroup>
          {filtered.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              onOpen={() => openEdit(user)}
              onImpersonate={() => handleImpersonate(user.id)}
            />
          ))}
        </ItemGroup>
      )}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. `statusMeta` and `isLinkExpired` are no longer called directly inside `UsersManager`'s render body for this branch — that's expected, they're now only used inside `UserListItem` and `openEdit`/elsewhere; this must not produce "unused" lint errors since both are still referenced (e.g. `isLinkExpired`/`statusMeta` used inside `UserListItem`, `roleBadgeVariant`/`roleLabel` used both in `UserListItem` and the create/edit dialogs).

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`, log in as an ADMIN user, go to `/users`. Confirm the list renders identically to before this change: same rows, same badges, same impersonate/edit buttons, same click-to-edit behavior, search still filters the same way. This is a pure refactor — pixel output should be unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/users/users-manager.tsx
git commit -m "refactor(users): extract UserListItem row component"
```

---

### Task 2: Add the "Por rol / Lista" toggle and grouped view

**Files:**
- Modify: `components/users/users-manager.tsx`

**Interfaces:**
- Consumes: `UserListItem` from Task 1, `roleLabel`, `filtered` (existing memo), `UserRole` type from `@/types/auth`.
- Produces: no new exports consumed elsewhere — `UsersManager` remains the only export of this file.

- [ ] **Step 1: Add imports**

At the top of `components/users/users-manager.tsx`, change:

```tsx
import { useState, useMemo, type ComponentProps } from "react"
```

to:

```tsx
import { useState, useMemo, useEffect, type ComponentProps } from "react"
```

And change the lucide-react import block:

```tsx
import {
  UserRoundPlus,
  Users,
  Search,
  RotateCcw,
  Trash2,
  Send,
  Copy,
  Check,
  Link,
  Settings2,
  VenetianMask
} from "lucide-react"
```

to:

```tsx
import {
  UserRoundPlus,
  Users,
  Search,
  RotateCcw,
  Trash2,
  Send,
  Copy,
  Check,
  Link,
  Settings2,
  VenetianMask,
  LayoutList,
  List,
  ChevronDown,
  ChevronRight
} from "lucide-react"
```

- [ ] **Step 2: Add `ROLE_ORDER` and `roleDotClass` helpers**

Just below the existing `roleLabel` function (which ends with `return role` / the closing `}` around what is currently line 90), insert:

```tsx
const ROLE_ORDER: UserRole[] = ["ADMIN", "BURSAR", "FINANCE", "MINISTER"]

function roleDotClass(role: UserRole) {
  if (role === "ADMIN") return "bg-primary"
  if (role === "BURSAR") return "bg-role-purple"
  if (role === "FINANCE") return "bg-income"
  if (role === "MINISTER") return "bg-warn"
  return "bg-muted-foreground"
}
```

- [ ] **Step 3: Add `viewMode` and `collapsedRoles` state, persist `viewMode`**

Inside `UsersManager`, right after the existing state declarations (after the line `const [linkCopied, setLinkCopied] = useState(false)`), insert:

```tsx
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped")
  const [collapsedRoles, setCollapsedRoles] = useState<Set<UserRole>>(new Set())

  useEffect(() => {
    const stored = window.localStorage.getItem("users-view-mode")
    if (stored === "flat" || stored === "grouped") setViewMode(stored)
  }, [])

  useEffect(() => {
    window.localStorage.setItem("users-view-mode", viewMode)
  }, [viewMode])
```

- [ ] **Step 4: Add the `groups` memo**

Right after the existing `filtered` memo (which ends with `}, [users, search])`), insert:

```tsx
  const groups = useMemo(() => {
    return ROLE_ORDER.map((role) => ({
      role,
      members: filtered.filter((u) => u.role === role)
    })).filter((g) => g.members.length > 0)
  }, [filtered])

  function toggleRoleCollapsed(role: UserRole) {
    setCollapsedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }
```

- [ ] **Step 5: Add the view-mode toggle next to the count line**

Find this exact block (the "Count" comment section):

```tsx
      {/* Count */}
      <p className="text-[12.5px] font-semibold text-muted-foreground">
        {filtered.length} integrante{filtered.length !== 1 ? "s" : ""}
        {search && ` — filtrando por "${search}"`}
      </p>
```

Replace it with:

```tsx
      {/* Count + view toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-muted-foreground">
          {filtered.length} integrante{filtered.length !== 1 ? "s" : ""}
          {search && ` — filtrando por "${search}"`}
        </p>
        <div className="flex gap-0.5 rounded-[11px] bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold transition-colors",
              viewMode === "grouped"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutList className="size-3.5" />
            Por rol
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold transition-colors",
              viewMode === "flat"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-3.5" />
            Lista
          </button>
        </div>
      </div>
```

- [ ] **Step 6: Branch the final render on `viewMode`**

Find the block produced by Task 1 (the final branch of the `users.length === 0 ? ... : filtered.length === 0 ? ... : (...)` ternary):

```tsx
      ) : (
        <ItemGroup>
          {filtered.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              onOpen={() => openEdit(user)}
              onImpersonate={() => handleImpersonate(user.id)}
            />
          ))}
        </ItemGroup>
      )}
```

Replace it with:

```tsx
      ) : viewMode === "flat" ? (
        <ItemGroup>
          {filtered.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              onOpen={() => openEdit(user)}
              onImpersonate={() => handleImpersonate(user.id)}
            />
          ))}
        </ItemGroup>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const collapsed = collapsedRoles.has(group.role)
            return (
              <div key={group.role}>
                <button
                  type="button"
                  onClick={() => toggleRoleCollapsed(group.role)}
                  className="mb-3.5 flex w-full select-none items-center gap-2"
                >
                  {collapsed ? (
                    <ChevronRight className="size-[15px] shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-[15px] shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn("size-2 rounded-full", roleDotClass(group.role))} />
                  <span className="text-[12.5px] font-extrabold">{roleLabel(group.role)}</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-bold text-muted-foreground">
                    {group.members.length}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </button>
                {!collapsed && (
                  <ItemGroup>
                    {group.members.map((user) => (
                      <UserListItem
                        key={user.id}
                        user={user}
                        onOpen={() => openEdit(user)}
                        onImpersonate={() => handleImpersonate(user.id)}
                      />
                    ))}
                  </ItemGroup>
                )}
              </div>
            )
          })}
        </div>
      )}
```

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. If `bg-role-purple` or `bg-income`/`bg-warn` aren't recognized Tailwind classes, check `app/globals.css` for the exact custom color token names (they're already used via `badge.tsx`'s `dotVariants` — e.g. `bg-role-purple`, `bg-income`, `bg-warn` — reuse those exact class names, don't invent new ones).

- [ ] **Step 8: Manual verification in the browser**

Run: `pnpm dev`, log in as an ADMIN user, go to `/users`. Confirm:
- Page loads with "Por rol" active by default (grouped view), showing one collapsible section per role that has at least one member, in order Administrador → Tesorero → Finanzas → Ministro, each with a colored dot, count badge, and a divider line.
- Clicking a section's chevron collapses/expands just that section.
- Clicking "Lista" switches to the flat list (identical to Task 1's output); clicking "Por rol" switches back.
- Typing in the search box while in "Por rol" view narrows each group's members and hides any group left with zero matches.
- Reloading the page after switching to "Lista" keeps "Lista" active (persisted via `localStorage`); after reloading, all groups are expanded again if you switch back to "Por rol" (collapse state is not persisted).
- Editing/impersonating a user from within a grouped section still opens the correct dialog / starts impersonation for that exact user.

- [ ] **Step 9: Commit**

```bash
git add components/users/users-manager.tsx
git commit -m "feat(users): add Por rol / Lista grouped view toggle"
```
