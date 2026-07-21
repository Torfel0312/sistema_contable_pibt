import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { auditService } from "@/services/audit/audit.service"
import { insertMovementAttachments } from "@/services/movements/movements.service"
import type { CreatePayrollInput } from "@/lib/validators/payroll"

type DB = SupabaseClient<Database>

const PAYROLL_CATEGORY_NAME = "Remuneraciones"

export const payrollService = {
  async create(db: DB, input: CreatePayrollInput, userId: string) {
    const admin = createSupabaseAdminClient()

    const { data: category, error: categoryErr } = await admin
      .from("movement_categories")
      .select("id")
      .eq("name", PAYROLL_CATEGORY_NAME)
      .eq("movement_type", "EXPENSE")
      .single()
    if (categoryErr || !category) {
      throw new Error(`No se encontró la categoría del sistema '${PAYROLL_CATEGORY_NAME}'`)
    }

    const { data: rpcData, error: rpcError } = await admin.rpc("register_payroll", {
      p_period: input.period,
      p_category_id: category.id,
      p_created_by_id: userId,
      p_lines: input.lines.map((line) => ({
        title: line.title,
        amount: line.amount,
        movement_date: line.movement_date,
        delivered_by: line.delivered_by ?? null,
        notes: line.notes ?? null
      }))
    })
    if (rpcError) {
      // The only unique constraint register_payroll() can hit is payroll_records.period,
      // so 23505 unambiguously means "already registered this month."
      if (rpcError.code === "23505") {
        throw new Error("Ya existe un registro de remuneración para este mes")
      }
      throw rpcError
    }

    // register_payroll() returns the created (title, movement_id) pairs in the exact
    // order they were inserted, so payrollMovements[i] reliably corresponds to
    // input.lines[i] — re-querying payroll_movements ordered by created_at would not,
    // since every row from one call shares the same transaction-scoped timestamp.
    const { record_id: recordId, movements: payrollMovements } = rpcData as {
      record_id: string
      movements: { movement_id: string; title: string }[]
    }

    await Promise.all(
      input.lines.map(async (line, i) => {
        const movementId = payrollMovements[i]?.movement_id
        if (!movementId) return

        await auditService.logMovement({
          movement_id: movementId,
          user_id: userId,
          action: "MOVEMENT_CREATED_FROM_PAYROLL",
          new_value: { payroll_record_id: recordId, title: line.title, amount: line.amount }
        })

        if (line.attachments.length) {
          await insertMovementAttachments(db, movementId, line.attachments, userId)
        }
      })
    )

    // payroll_records has no authenticated-role UPDATE policy — all writes to it
    // go through the service-role admin client, same as the register_payroll RPC above.
    const { error: liquidacionErr } = await admin
      .from("payroll_records")
      .update({
        liquidacion_drive_file_id: input.liquidacion.driveFileId,
        liquidacion_drive_view_link: input.liquidacion.driveViewLink,
        liquidacion_file_name: input.liquidacion.fileName,
        liquidacion_mime_type: input.liquidacion.mimeType,
        liquidacion_size_bytes: input.liquidacion.sizeBytes
      })
      .eq("id", recordId)
    if (liquidacionErr) throw liquidacionErr

    await auditService.logSystem({
      entity: "PAYROLL_RECORD",
      action: "PAYROLL_REGISTERED",
      user_id: userId,
      entity_id: recordId,
      new_value: { period: input.period, lines: input.lines.length }
    })

    return this.getById(db, recordId)
  },

  async list(db: DB) {
    const { data, error } = await db
      .from("payroll_records")
      .select(
        "*, payroll_movements(id, title, movements(id, amount, movement_date, delivered_by, notes, movement_attachments(*)))"
      )
      .order("period", { ascending: false })
    if (error) throw error
    return data
  },

  async getById(db: DB, id: string) {
    const { data, error } = await db
      .from("payroll_records")
      .select(
        "*, created_by_user:users!payroll_records_created_by_id_fkey(full_name), payroll_movements(id, title, movements(id, amount, movement_date, delivered_by, notes, movement_attachments(*)))"
      )
      .eq("id", id)
      .single()
    if (error) throw error
    return data
  }
}
