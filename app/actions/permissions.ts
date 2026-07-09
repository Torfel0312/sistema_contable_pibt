"use server"

import { revalidatePath } from "next/cache"
import {
  getCurrentUser,
  createSupabaseServerClient,
  revalidateRolePermissions
} from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { updatePermission } from "@/services/permissions/permissions.service"
import type { UserRole } from "@/types/auth"
import type { Permission } from "@/lib/permissions/rbac"

export async function updateRolePermission(
  role: UserRole,
  permission: Permission,
  enabled: boolean
) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) {
    throw new Error("Sin permisos para gestionar permisos")
  }

  const supabase = await createSupabaseServerClient()
  await updatePermission(supabase, role, permission, enabled)
  revalidateRolePermissions()
  revalidatePath("/settings/permissions")
}
