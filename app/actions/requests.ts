"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can, canAccessWorkflow } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { ministriesService } from "@/services/ministries/ministries.service"
import type {
  CreateIntentionInput,
  ReviewIntentionInput,
  RegisterTransferInput,
  AddCommentInput
} from "@/lib/validators/intention"

export async function createRequest(input: CreateIntentionInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    throw new Error("Sin permisos para enviar solicitudes")
  }

  const db = await createSupabaseServerClient()
  const assignment = await ministriesService.getMinistryForUser(db, user.id)
  if (!assignment) {
    throw new Error("No tienes un ministerio asignado")
  }

  const created = await intentionsService.create(db, input, user.id, assignment.ministry_id)
  revalidatePath("/requests")
  return created
}

export async function reviewRequest(
  id: string,
  input: ReviewIntentionInput
): Promise<{ alreadyActioned: true } | { alreadyActioned: false; data: unknown }> {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS)) {
    throw new Error("Sin permisos para revisar solicitudes")
  }

  const db = await createSupabaseServerClient()
  const result = await intentionsService.review(db, id, input, user.id)
  if (!result.alreadyActioned) {
    revalidatePath(`/requests/${id}`)
    revalidatePath("/requests")
  }
  return result as { alreadyActioned: true } | { alreadyActioned: false; data: unknown }
}

export async function registerTransfer(id: string, input: RegisterTransferInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS)) {
    throw new Error("Sin permisos para registrar transferencias")
  }

  const db = await createSupabaseServerClient()
  const data = await intentionsService.registerTransfer(db, id, input, user.id)
  revalidatePath(`/requests/${id}`)
  return data
}

export async function addComment(id: string, input: AddCommentInput) {
  const user = await getCurrentUser()
  if (!user || !canAccessWorkflow(user.permissions)) {
    throw new Error("Sin permisos")
  }

  const db = await createSupabaseServerClient()
  const data = await intentionsService.addComment(db, id, "INTENTION", input, user.id)
  revalidatePath(`/requests/${id}`)
  return data
}
