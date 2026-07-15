import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { auditService } from "@/services/audit/audit.service"
import { deleteFileFromDrive } from "@/services/google/drive.service"

type DB = SupabaseClient<Database>

export const movementAttachmentsService = {
  async remove(db: DB, attachmentId: string, userId: string): Promise<void> {
    const { data: attachment, error: fetchError } = await db
      .from("movement_attachments")
      .select("id, movement_id, drive_file_id, file_name")
      .eq("id", attachmentId)
      .single()

    if (fetchError) throw fetchError
    if (!attachment) throw new Error("Adjunto no encontrado")

    try {
      await deleteFileFromDrive(attachment.drive_file_id)
    } catch (error) {
      // Non-fatal: don't let a Drive-side failure block removing the reference —
      // the goal is removing it from the movement regardless of Drive state.
      console.warn("deleteFileFromDrive failed", { attachmentId, error })
    }

    // movement_attachments RLS restricts delete to ADMIN/BURSAR — use the admin
    // client the same way audit.service.ts does for privileged writes.
    const admin = createSupabaseAdminClient()
    const { error: deleteError } = await admin
      .from("movement_attachments")
      .delete()
      .eq("id", attachmentId)

    if (deleteError) throw deleteError

    await auditService.logMovement({
      movement_id: attachment.movement_id,
      user_id: userId,
      action: "Adjunto eliminado",
      note: attachment.file_name
    })
  }
}
