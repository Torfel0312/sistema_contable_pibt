import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import {
  sendIntentionNotification,
  sendIntentionReviewNotification,
  sendTransferNotification
} from "@/services/email/workflow-emails.service"
import { insertMovementAttachments } from "@/services/movements/movements.service"
import { increment_and_get_folio } from "@/lib/utils/folio"
import type {
  CreateIntentionInput,
  ReviewIntentionInput,
  RegisterTransferInput,
  AddCommentInput
} from "@/lib/validators/intention"

type DB = SupabaseClient<Database>

export const intentionsService = {
  async list(db: DB, filters?: { ministryId?: string; status?: string }) {
    let query = db
      .from("budget_intentions")
      .select(
        "*, ministries(id, name), users!budget_intentions_requested_by_fkey(id, full_name, email)"
      )
      .order("created_at", { ascending: false })

    if (filters?.ministryId) query = query.eq("ministry_id", filters.ministryId)
    if (filters?.status)
      query = query.eq("status", filters.status as "PENDING" | "APPROVED" | "REJECTED")

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getById(db: DB, id: string) {
    const { data, error } = await db
      .from("budget_intentions")
      .select(
        "*, ministries(id, name), users!budget_intentions_requested_by_fkey(id, full_name, email), intention_attachments(*)"
      )
      .eq("id", id)
      .single()
    if (error) throw error
    return data
  },

  async getByToken(db: DB, token: string) {
    const { data, error } = await db
      .from("budget_intentions")
      .select(
        "*, ministries(id, name), users!budget_intentions_requested_by_fkey(id, full_name, email)"
      )
      .eq("token", token)
      .single()
    if (error) throw error
    return data
  },

  async create(db: DB, input: CreateIntentionInput, userId: string, ministryId: string) {
    const { data, error } = await db
      .from("budget_intentions")
      .insert({
        ministry_id: ministryId,
        requested_by: userId,
        amount: input.amount,
        purpose: input.purpose,
        date_needed: input.date_needed ?? null,
        funding_method: input.funding_method
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "BUDGET_INTENTION",
      action: "INTENTION_CREATED",
      user_id: userId,
      entity_id: data.id,
      new_value: { amount: data.amount, ministry_id: ministryId }
    })

    await sendIntentionNotification(data).catch(() => null)

    return data
  },

  async review(db: DB, id: string, input: ReviewIntentionInput, reviewerId: string) {
    const now = new Date().toISOString()

    const { data: current } = await db
      .from("budget_intentions")
      .select("status, users!budget_intentions_requested_by_fkey(email, full_name)")
      .eq("id", id)
      .single()

    if (current?.status !== "PENDING") {
      return { alreadyActioned: true }
    }

    const { data, error } = await db
      .from("budget_intentions")
      .update({
        status: input.action,
        reviewed_by: reviewerId,
        reviewed_at: now,
        review_message: input.message,
        updated_at: now
      })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "BUDGET_INTENTION",
      action: `INTENTION_${input.action}`,
      user_id: reviewerId,
      entity_id: id,
      previous_value: { status: "PENDING" },
      new_value: { status: input.action, message: input.message }
    })

    const ministerUser = current?.users
    if (ministerUser?.email) {
      await sendIntentionReviewNotification(data, ministerUser, input.action).catch(() => null)
    }

    return { alreadyActioned: false, data }
  },

  async registerTransfer(
    db: DB,
    intentionId: string,
    input: RegisterTransferInput,
    userId: string
  ) {
    const intention = await this.getById(db, intentionId)

    const { data: category, error: categoryErr } = await db
      .from("movement_categories")
      .select("id")
      .eq("name", "Transferencias a Ministerios")
      .eq("is_system", true)
      .single()
    if (categoryErr || !category) {
      throw new Error("No se encontró la categoría del sistema 'Transferencias a Ministerios'")
    }

    const folio = await increment_and_get_folio()

    const { data: movement, error: movErr } = await db
      .from("movements")
      .insert({
        folio,
        movement_date: input.transfer_date,
        movement_type: "EXPENSE",
        amount: input.amount,
        category_id: category.id,
        delivered_by: intention.users?.full_name ?? "Ministro",
        created_by_id: userId,
        notes: `Transferencia por concepto de solicitud del ministerio: ${intention.ministries?.name ?? ""}`
      })
      .select("id")
      .single()
    if (movErr) throw movErr

    if (input.attachments?.length) {
      await insertMovementAttachments(db, movement.id, input.attachments, userId)
    }

    await auditService.logMovement({
      movement_id: movement.id,
      action: "MOVEMENT_CREATED_FROM_TRANSFER",
      user_id: userId,
      new_value: { intention_id: intentionId, amount: input.amount }
    })

    const { data, error } = await db
      .from("intention_transfers")
      .insert({
        intention_id: intentionId,
        amount: input.amount,
        transfer_date: input.transfer_date,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        registered_by: userId,
        movement_id: movement.id
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "INTENTION_TRANSFER",
      action: "TRANSFER_REGISTERED",
      user_id: userId,
      entity_id: intentionId,
      new_value: { amount: input.amount, transfer_date: input.transfer_date }
    })

    const ministerUser = intention.users
    if (ministerUser?.email) {
      await sendTransferNotification(intention, ministerUser).catch(() => null)
    }

    return data
  },

  async getTransfer(db: DB, intentionId: string) {
    const { data, error } = await db
      .from("intention_transfers")
      .select("*")
      .eq("intention_id", intentionId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async addComment(
    db: DB,
    entityId: string,
    entityType: "INTENTION" | "SETTLEMENT",
    input: AddCommentInput,
    userId: string
  ) {
    const { data, error } = await db
      .from("request_comments")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        message: input.message
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getComments(db: DB, entityId: string, entityType: "INTENTION" | "SETTLEMENT") {
    const { data, error } = await db
      .from("request_comments")
      .select("*, users(id, full_name, role)")
      .eq("entity_id", entityId)
      .eq("entity_type", entityType)
      .order("created_at")
    if (error) throw error
    return data
  },

  async getPendingCount(db: DB, ministryId?: string) {
    let query = db
      .from("budget_intentions")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING")

    if (ministryId) query = query.eq("ministry_id", ministryId)

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  },

  async getMissingTransfersCount(db: DB) {
    const { data, error } = await db.from("budget_intentions").select("id").eq("status", "APPROVED")

    if (error) throw error
    if (!data || data.length === 0) return 0

    const approvedIds = data.map((d) => d.id)
    const { data: transfers, error: tErr } = await db
      .from("intention_transfers")
      .select("intention_id")
      .in("intention_id", approvedIds)
    if (tErr) throw tErr

    const transferredIds = new Set((transfers ?? []).map((t) => t.intention_id))
    return approvedIds.filter((id) => !transferredIds.has(id)).length
  }
}
