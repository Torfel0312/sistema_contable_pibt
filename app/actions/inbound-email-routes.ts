"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { inboundRoutesService } from "@/services/email/inbound-routes.service"
import type { CreateInboundEmailRouteInput } from "@/lib/validators/inbound-email-route"

function assertSettingsAccess(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) {
    throw new Error("Sin permisos para gestionar configuración")
  }
  return user
}

export async function listInboundEmailRoutes() {
  assertSettingsAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  return inboundRoutesService.list(db)
}

export async function createInboundEmailRoute(input: CreateInboundEmailRouteInput) {
  const user = assertSettingsAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await inboundRoutesService.create(db, input, user.id)
  revalidatePath("/settings")
  return data
}

export async function removeInboundEmailRoute(id: string) {
  const user = assertSettingsAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  await inboundRoutesService.remove(db, id, user.id)
  revalidatePath("/settings")
}
