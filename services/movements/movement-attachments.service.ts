import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import { attachmentStorageService } from "@/services/storage/attachment-storage.service"

type DB = SupabaseClient<Database>

export const movementAttachmentsService = {
  async remove(db: DB, attachmentId: string, userId: string): Promise<void> {
    const { data: attachment, error: fetchError } = await db
      .from("movement_attachments")
      .select("id, movement_id, storage_path, file_name")
      .eq("id", attachmentId)
      .single()

    if (fetchError) throw fetchError
    if (!attachment) throw new Error("Adjunto no encontrado")

    try {
      await attachmentStorageService.remove(attachment.storage_path)
    } catch (error) {
      // Non-fatal: don't let a storage-side failure block removing the reference —
      // the goal is removing it from the movement regardless of storage state.
      console.warn("attachmentStorageService.remove failed", { attachmentId, error })
    }

    // movement_attachments RLS already allows ADMIN/BURSAR to delete directly —
    // same roles CREATE_MOVEMENT is gated on, so the caller's own authenticated
    // client is sufficient here, no admin bypass needed.
    const { error: deleteError } = await db.from("movement_attachments").delete().eq("id", attachmentId)

    if (deleteError) throw deleteError

    await auditService.logMovement({
      movement_id: attachment.movement_id,
      user_id: userId,
      action: "Adjunto eliminado",
      note: attachment.file_name
    })
  }
}
