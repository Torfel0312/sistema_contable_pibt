import type { SupabaseClient } from "@supabase/supabase-js"
import type { UserRole } from "@/types/auth"
import type { Permission } from "@/lib/permissions/rbac"

export type PermissionMap = Record<UserRole, Set<Permission>>

export async function getPermissionMap(supabase: SupabaseClient): Promise<PermissionMap> {
  const { data } = await supabase
    .from("role_permissions")
    .select("role, permission")
    .eq("enabled", true)

  const map: PermissionMap = {
    ADMIN: new Set(),
    BURSAR: new Set(),
    FINANCE: new Set(),
    MINISTER: new Set(),
    DELEGATE: new Set()
  }

  for (const row of data ?? []) {
    map[row.role as UserRole]?.add(row.permission as Permission)
  }

  return map
}

export async function updatePermission(
  supabase: SupabaseClient,
  role: UserRole,
  permission: Permission,
  enabled: boolean
): Promise<void> {
  await supabase.from("role_permissions").upsert({ role, permission, enabled })
}
