import type { UserRole } from "@/types/auth"

// Self-referential value constants: use these instead of raw "ADMIN"/"BURSAR"/... literals
// in comparisons, mirroring the PERMISSIONS pattern in lib/permissions/rbac.ts.
export const USER_ROLES: Record<UserRole, UserRole> = {
  ADMIN: "ADMIN",
  BURSAR: "BURSAR",
  FINANCE: "FINANCE",
  MINISTER: "MINISTER"
}

export const ROLE_ORDER: UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.BURSAR,
  USER_ROLES.FINANCE,
  USER_ROLES.MINISTER
]

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  BURSAR: "Tesorero",
  FINANCE: "Comisión de Finanzas",
  MINISTER: "Encargado de Ministerio"
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role as UserRole] ?? role
}

export type RoleBadgeVariant = "primary" | "role" | "income" | "warn"

export const ROLE_BADGE_VARIANT: Record<UserRole, RoleBadgeVariant> = {
  ADMIN: "primary",
  BURSAR: "role",
  FINANCE: "income",
  MINISTER: "warn"
}

export const ROLE_DOT_CLASS: Record<UserRole, string> = {
  ADMIN: "bg-primary",
  BURSAR: "bg-role-purple",
  FINANCE: "bg-income",
  MINISTER: "bg-warn"
}
