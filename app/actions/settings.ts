"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { settingsService } from "@/services/settings/settings.service"
import type { UpdateSettingsInput } from "@/lib/validators/settings"

export async function updateSettings(input: UpdateSettingsInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) {
    throw new Error("Sin permisos para actualizar configuración")
  }

  const db = await createSupabaseServerClient()
  const data = await settingsService.update(db, input, user.id)
  revalidatePath("/settings/general")
  return data
}
