"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { movementsService } from "@/services/movements/movements.service"
import { movementAttachmentsService } from "@/services/movements/movement-attachments.service"
import { processMovementIntegrations } from "@/services/google/movement-postprocess"
import { uploadFileToDrive, deleteFileFromDrive } from "@/services/google/drive.service"
import { sendVoucherEmail } from "@/services/vouchers/voucher.service"
import { settingsService } from "@/services/settings/settings.service"
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants/attachments"
import type {
  CreateMovementInput,
  UpdateMovementInput,
  CancelMovementInput
} from "@/lib/validators/movement"

// Schedules PDF/Sheet/email integrations to run after the response is sent.
// Errors are logged so they're visible in platform logs instead of swallowed.
function scheduleIntegrations(movementId: string, userId: string) {
  after(async () => {
    try {
      await processMovementIntegrations(movementId, userId)
    } catch (error) {
      console.error("processMovementIntegrations failed", { movementId, error })
    }
  })
}

export async function createMovement(input: CreateMovementInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos para crear movimientos")
  }

  const db = await createSupabaseServerClient()
  const created = await movementsService.create(db, input, user.id)
  scheduleIntegrations(created.id, user.id)

  if (created.movement_type === "INCOME" && created.receipt_email) {
    after(async () => {
      try {
        const settings = await settingsService.getAll(createSupabaseAdminClient())
        await sendVoucherEmail(created.id, created.receipt_email!, {
          bcc: settings.notifications_bcc_email || undefined
        })
      } catch (error) {
        console.error("sendVoucherEmail (auto receipt confirmation) failed", {
          movementId: created.id,
          error
        })
      }
    })
  }

  revalidatePath("/movements")
  return created
}

export async function updateMovement(id: string, input: Omit<UpdateMovementInput, "id">) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos para editar movimientos")
  }

  const db = await createSupabaseServerClient()
  const updated = await movementsService.update(db, id, { ...input, id }, user.id)
  scheduleIntegrations(updated.id, user.id)
  revalidatePath(`/movements/${id}`)
  revalidatePath("/movements")
  return updated
}

export async function cancelMovement(id: string, input: CancelMovementInput) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos para anular movimientos")
  }

  const db = await createSupabaseServerClient()
  const result = await movementsService.cancel(db, id, input, user.id)
  scheduleIntegrations(result.id, user.id)
  revalidatePath(`/movements/${id}`)
  revalidatePath("/movements")
  return result
}

export async function regeneratePdf(id: string) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos")
  }

  await processMovementIntegrations(id, user.id)
  revalidatePath(`/movements/${id}`)
}

// This action just uploads a file to Drive and hands back its metadata — it
// doesn't touch any movement-specific table, so it's shared by every entity
// that attaches files to Drive (movements, transfer registration, ministry
// settlements). Anyone who can create a movement, submit a request, or
// review one can use it.
function canUploadDriveAttachment(permissions: Set<string> | undefined): boolean {
  return (
    can(permissions, PERMISSIONS.CREATE_MOVEMENT) ||
    can(permissions, PERMISSIONS.CREATE_REQUEST) ||
    can(permissions, PERMISSIONS.CREATE_SETTLEMENT) ||
    can(permissions, PERMISSIONS.REVIEW_INTENTIONS)
  )
}

export async function uploadMovementAttachment(
  formData: FormData
): Promise<
  | {
      driveFileId: string
      driveViewLink: string
      fileName: string
      mimeType: string
      sizeBytes: number
    }
  | { error: string }
> {
  const user = await getCurrentUser()
  if (!user || !canUploadDriveAttachment(user.permissions)) {
    return { error: "Sin permisos para adjuntar archivos" }
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { error: "Archivo no válido" }
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { error: "El archivo supera el tamaño máximo permitido (30MB)" }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const { driveFileId, driveViewLink } = await uploadFileToDrive({
      fileName: file.name,
      mimeType: file.type,
      buffer
    })

    return {
      driveFileId,
      driveViewLink,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    }
  } catch (error) {
    console.error("uploadFileToDrive failed", error)
    return { error: "No se pudo subir el archivo a Google Drive" }
  }
}

// Cleans up a Drive file for an attachment that was uploaded but never persisted
// to a movement (e.g. the user clicked "remove" before submitting the form). There
// is no DB row to touch here — persisted attachments must go through
// removeMovementAttachment, which handles the DB row + Drive deletion together.
export async function deleteUnattachedDriveAttachment(driveFileId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user || !canUploadDriveAttachment(user.permissions)) {
    throw new Error("Sin permisos para eliminar adjuntos")
  }

  try {
    await deleteFileFromDrive(driveFileId)
  } catch (error) {
    console.error("deleteUnattachedDriveAttachment failed", { driveFileId, error })
  }
}

export async function removeMovementAttachment(attachmentId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos para eliminar adjuntos")
  }

  const db = await createSupabaseServerClient()
  await movementAttachmentsService.remove(db, attachmentId, user.id)
}
