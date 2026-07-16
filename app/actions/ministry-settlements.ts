"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { settlementsService } from "@/services/settlements/settlements.service"
import { settlementAttachmentsService } from "@/services/settlements/settlement-attachments.service"
import type { CreateSettlementInput, ReviewSettlementInput, CloseIntentionInput } from "@/lib/validators/settlement"

export async function createMinistrySettlement(input: CreateSettlementInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    throw new Error("Solo los ministros pueden enviar rendiciones")
  }

  const db = await createSupabaseServerClient()
  const data = await settlementsService.create(db, input, user.id)
  revalidatePath(`/requests/${input.intention_id}`)
  return data
}

export async function submitSettlement(id: string, intentionId: string) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    throw new Error("Solo los ministros pueden enviar rendiciones a revisión")
  }

  const db = await createSupabaseServerClient()
  const result = await settlementsService.submit(db, id, user.id)
  revalidatePath(`/requests/${intentionId}`)
  return result
}

export async function cancelSettlement(id: string, intentionId: string) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    throw new Error("Solo los ministros pueden cancelar rendiciones")
  }

  const db = await createSupabaseServerClient()
  const data = await settlementsService.cancel(db, id, user.id)
  revalidatePath(`/requests/${intentionId}`)
  return data
}

export async function startReviewSettlement(id: string, intentionId: string) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS)) {
    throw new Error("Sin permisos para revisar rendiciones")
  }

  const db = await createSupabaseServerClient()
  const result = await settlementsService.startReview(db, id, user.id)
  revalidatePath(`/requests/${intentionId}`)
  return result
}

export async function reviewMinistrySettlement(
  id: string,
  intentionId: string,
  input: ReviewSettlementInput
) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS)) {
    throw new Error("Sin permisos para revisar rendiciones")
  }

  const db = await createSupabaseServerClient()
  const result = await settlementsService.review(db, id, input, user.id)
  revalidatePath(`/requests/${intentionId}`)
  return result
}

export async function removeSettlementAttachment(attachmentId: string, intentionId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const db = await createSupabaseServerClient()
  await settlementAttachmentsService.remove(db, attachmentId, user.id)
  revalidatePath(`/requests/${intentionId}`)
}

export async function closeIntentionSettlements(input: CloseIntentionInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS)) {
    throw new Error("Sin permisos para cerrar la solicitud")
  }

  const db = await createSupabaseServerClient()
  const data = await settlementsService.closeIntention(db, input, user.id)
  revalidatePath(`/requests/${input.intention_id}`)
  return data
}
