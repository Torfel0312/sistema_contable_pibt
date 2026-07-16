import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import { deleteFileFromDrive } from "@/services/google/drive.service"

type DB = SupabaseClient<Database>

export const settlementAttachmentsService = {
  async remove(db: DB, attachmentId: string, userId: string): Promise<void> {
    const { data: attachment, error: fetchError } = await db
      .from("settlement_attachments")
      .select("id, settlement_id, drive_file_id, file_name")
      .eq("id", attachmentId)
      .single()

    if (fetchError) throw fetchError
    if (!attachment) throw new Error("Adjunto no encontrado")

    try {
      await deleteFileFromDrive(attachment.drive_file_id)
    } catch (error) {
      // Non-fatal: don't let a Drive-side failure block removing the reference —
      // the goal is removing it from the settlement regardless of Drive state.
      console.warn("deleteFileFromDrive failed", { attachmentId, error })
    }

    // settlement_attachments_delete RLS already scopes this to ADMIN/BURSAR or the
    // owning minister while the settlement is still editable — the caller's own
    // authenticated client is sufficient here, no admin bypass needed. A blocked
    // delete (e.g. settlement already IN_REVIEW) surfaces as zero rows affected.
    const { error: deleteError, count } = await db
      .from("settlement_attachments")
      .delete({ count: "exact" })
      .eq("id", attachmentId)

    if (deleteError) throw deleteError
    if (!count) {
      throw new Error("No se puede eliminar este adjunto en el estado actual de la rendición")
    }

    await auditService.logSystem({
      entity: "EXPENSE_SETTLEMENT",
      action: "SETTLEMENT_ATTACHMENT_REMOVED",
      user_id: userId,
      entity_id: attachment.settlement_id,
      new_value: { file_name: attachment.file_name }
    })
  }
}
