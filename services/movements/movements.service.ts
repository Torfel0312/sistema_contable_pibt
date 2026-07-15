import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import { increment_and_get_folio } from "@/lib/utils/folio"
import { sanitizePostgrestSearch } from "@/lib/utils/postgrest"
import type {
  AttachmentInput,
  CancelMovementInput,
  CreateMovementInput,
  UpdateMovementInput
} from "@/lib/validators/movement"

type DB = SupabaseClient<Database>

function normalizeOptional(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

// Best-effort: attachments are inserted after the movement row already exists.
// If this fails, the movement itself is not rolled back (same non-transactional
// tolerance already used elsewhere in this codebase, e.g. folio increment + insert) —
// the error is logged server-side instead of blocking the movement response.
async function insertMovementAttachments(
  db: DB,
  movementId: string,
  attachments: AttachmentInput[],
  userId: string
) {
  const { error } = await db.from("movement_attachments").insert(
    attachments.map((attachment) => ({
      movement_id: movementId,
      drive_file_id: attachment.driveFileId,
      drive_view_link: attachment.driveViewLink,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )

  if (error) {
    console.error("insertMovementAttachments failed", { movementId, error })
  }
}

const PAGE_SIZE = 50

type ListFilters = {
  search?: string
  movement_type?: "INCOME" | "EXPENSE" | "ALL"
  status?: "ACTIVE" | "CANCELLED" | "ALL"
  page?: number
  pageSize?: number
}

export const movementsService = {
  async list(db: DB, filters: ListFilters = {}) {
    const pageSize = filters.pageSize ?? PAGE_SIZE
    const page = Math.max(1, filters.page ?? 1)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from("movements")
      .select(
        "id, folio, folio_display, movement_date, movement_type, amount, category, delivered_by, receipt_email, payment_method_id, notes, cancellation_reason, status, created_by_id, created_at, users!created_by_id(id, full_name, email), payment_methods:payment_method_id(name)",
        { count: "exact" }
      )
      .order("movement_date", { ascending: false })
      .order("folio", { ascending: false })
      .range(from, to)

    if (filters.movement_type && filters.movement_type !== "ALL") {
      query = query.eq("movement_type", filters.movement_type)
    }
    if (filters.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status)
    }
    if (filters.search?.trim()) {
      const s = sanitizePostgrestSearch(filters.search)
      if (s) {
        query = query.or(
          `folio_display.ilike.%${s}%,category.ilike.%${s}%,delivered_by.ilike.%${s}%`
        )
      }
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], count: count ?? 0, page, pageSize }
  },

  async findById(db: DB, id: string) {
    const { data, error } = await db
      .from("movements")
      .select(
        `*,
        created_by:users!created_by_id(id, full_name, email),
        updated_by:users!updated_by_id(id, full_name, email),
        cancelled_by:users!cancelled_by_id(id, full_name, email),
        movement_audit_log(*, users(id, full_name, email)),
        movement_attachments(*),
        payment_methods:payment_method_id(name)`
      )
      .eq("id", id)
      .order("event_date", { referencedTable: "movement_audit_log", ascending: false })
      .order("created_at", { referencedTable: "movement_attachments", ascending: true })
      .single()

    if (error) throw error
    return data
  },

  async create(db: DB, input: CreateMovementInput, userId: string) {
    // folio RPC is service_role only — uses admin client internally via folio utility
    const folio = await increment_and_get_folio()

    const { data: movement, error } = await db
      .from("movements")
      .insert({
        folio,
        movement_date: input.movement_date,
        movement_type: input.movement_type,
        amount: input.amount,
        category: input.category.trim(),
        delivered_by: normalizeOptional(input.delivered_by),
        receipt_email: normalizeOptional(input.receipt_email),
        payment_method_id: input.payment_method_id ?? null,
        notes: normalizeOptional(input.notes),
        created_by_id: userId
      })
      .select()
      .single()

    if (error) throw error

    await auditService.logMovement({
      movement_id: movement.id,
      user_id: userId,
      action: "Movimiento creado",
      new_value: movement,
      note: "Movimiento registrado exitosamente"
    })

    if (input.attachments.length) {
      await insertMovementAttachments(db, movement.id, input.attachments, userId)
    }

    return movement
  },

  async update(db: DB, id: string, input: UpdateMovementInput, userId: string) {
    const { data: previous, error: fetchError } = await db
      .from("movements")
      .select()
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError
    if (!previous) throw new Error("Movimiento no encontrado")
    if (previous.status === "CANCELLED") throw new Error("No se puede editar un movimiento anulado")

    const { data: updated, error } = await db
      .from("movements")
      .update({
        movement_date: input.movement_date,
        movement_type: input.movement_type,
        amount: input.amount,
        category: input.category.trim(),
        delivered_by: normalizeOptional(input.delivered_by),
        receipt_email: normalizeOptional(input.receipt_email),
        payment_method_id: input.payment_method_id ?? null,
        notes: normalizeOptional(input.notes),
        updated_by_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    await auditService.logMovement({
      movement_id: id,
      user_id: userId,
      action: "Movimiento editado",
      previous_value: previous,
      new_value: updated,
      note: "Información del movimiento actualizada"
    })

    // Only NEW attachments are appended here — existing ones aren't resent.
    if (input.attachments.length) {
      await insertMovementAttachments(db, id, input.attachments, userId)
    }

    return updated
  },

  async cancel(db: DB, id: string, input: CancelMovementInput, userId: string) {
    const { data: previous, error: fetchError } = await db
      .from("movements")
      .select()
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError
    if (!previous) throw new Error("Movimiento no encontrado")
    if (previous.status === "CANCELLED") return previous

    const now = new Date().toISOString()
    const { data: cancelled, error } = await db
      .from("movements")
      .update({
        status: "CANCELLED",
        cancellation_reason: input.cancellation_reason.trim(),
        cancelled_by_id: userId,
        cancelled_at: now,
        updated_by_id: userId,
        updated_at: now
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    await auditService.logMovement({
      movement_id: id,
      user_id: userId,
      action: "Movimiento anulado",
      previous_value: previous,
      new_value: cancelled,
      note: input.cancellation_reason.trim()
    })

    return cancelled
  }
}
