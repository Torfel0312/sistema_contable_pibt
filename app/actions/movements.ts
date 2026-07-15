"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { movementsService } from "@/services/movements/movements.service"
import { movementAttachmentsService } from "@/services/movements/movement-attachments.service"
import { processMovementIntegrations } from "@/services/google/movement-postprocess"
import { uploadFileToDrive, deleteFileFromDrive } from "@/services/google/drive.service"
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
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
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
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
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
