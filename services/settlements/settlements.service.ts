import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import { sendSettlementReviewNotification } from "@/services/email/workflow-emails.service"
import type { CreateSettlementInput, ReviewSettlementInput } from "@/lib/validators/settlement"

type DB = SupabaseClient<Database>

const LATE_THRESHOLD_DAYS = 30

export const settlementsService = {
  async list(
    db: DB,
    filters?: {
      intentionId?: string
      ministryId?: string
      status?: string
      submittedBy?: string
    }
  ) {
    let query = db
      .from("expense_settlements")
      .select(
        "*, budget_intentions(id, ministry_id, ministries(id, name)), users!expense_settlements_submitted_by_fkey(id, full_name, email)"
      )
      .order("created_at", { ascending: false })

    if (filters?.intentionId) query = query.eq("intention_id", filters.intentionId)
    if (filters?.submittedBy) query = query.eq("submitted_by", filters.submittedBy)
    if (filters?.status)
      query = query.eq("status", filters.status as "PENDING" | "APPROVED" | "REJECTED")

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getById(db: DB, id: string) {
    const { data, error } = await db
      .from("expense_settlements")
      .select(
        "*, budget_intentions(id, ministry_id, amount, ministries(id, name)), users!expense_settlements_submitted_by_fkey(id, full_name, email)"
      )
      .eq("id", id)
      .single()
    if (error) throw error
    return data
  },

  async create(db: DB, input: CreateSettlementInput, userId: string) {
    const expenseDate = new Date(input.expense_date)
    const daysDiff = Math.floor((Date.now() - expenseDate.getTime()) / 86_400_000)
    const isLate = daysDiff > LATE_THRESHOLD_DAYS

    const { data, error } = await db
      .from("expense_settlements")
      .insert({
        intention_id: input.intention_id,
        submitted_by: userId,
        amount: input.amount,
        description: input.description,
        expense_date: input.expense_date,
        is_late: isLate,
        attachment_url: input.attachment_url ?? null
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "EXPENSE_SETTLEMENT",
      action: "SETTLEMENT_CREATED",
      user_id: userId,
      entity_id: data.id,
      new_value: { amount: data.amount, intention_id: input.intention_id, is_late: isLate }
    })

    return data
  },

  async review(db: DB, id: string, input: ReviewSettlementInput, reviewerId: string) {
    const now = new Date().toISOString()

    const { data: current } = await db
      .from("expense_settlements")
      .select("status, users!expense_settlements_submitted_by_fkey(email, full_name)")
      .eq("id", id)
      .single()

    if (current?.status !== "PENDING") {
      return { alreadyActioned: true }
    }

    let movementId: string | null = null

    if (input.action === "APPROVED") {
      const settlement = await this.getById(db, id)
      const intention = settlement.budget_intentions
      const ministry = intention?.ministries

      // Movement INSERT requires service_role: movements_insert RLS only allows ADMIN/BURSAR,
      // but FINANCE reviewers must also be able to approve. Admin client is used here explicitly.
      const { createSupabaseAdminClient: getAdmin } = await import("@/lib/supabase/admin")
      const { increment_and_get_folio } = await import("@/lib/utils/folio")
      const folio = await increment_and_get_folio()

      const adminClient = getAdmin()
      const { data: movement, error: movErr } = await adminClient
        .from("movements")
        .insert({
          folio,
          movement_date: now.slice(0, 10),
          movement_type: "EXPENSE",
          amount: settlement.amount,
          category: "Rendición Ministerio",
          delivered_by: ministry?.name ?? "Ministerio",
          created_by_id: reviewerId,
          notes: `Rendición: ${settlement.description}. Rendición automática desde solicitud aprobada. Ministerio: ${ministry?.name ?? ""}`
        })
        .select("id")
        .single()
      if (movErr) throw movErr
      movementId = movement.id

      await auditService.logMovement({
        movement_id: movementId,
        action: "MOVEMENT_CREATED_FROM_SETTLEMENT",
        user_id: reviewerId,
        new_value: { settlement_id: id, amount: settlement.amount }
      })
    }

    const { data, error } = await db
      .from("expense_settlements")
      .update({
        status: input.action,
        reviewed_by: reviewerId,
        reviewed_at: now,
        review_message: input.message,
        movement_id: movementId,
        updated_at: now
      })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "EXPENSE_SETTLEMENT",
      action: `SETTLEMENT_${input.action}`,
      user_id: reviewerId,
      entity_id: id,
      previous_value: { status: "PENDING" },
      new_value: { status: input.action, message: input.message, movement_id: movementId }
    })

    const ministerUser = current?.users
    if (ministerUser?.email) {
      await sendSettlementReviewNotification(data, ministerUser, input.action).catch(() => null)
    }

    return { alreadyActioned: false, data }
  },

  async getPendingCount(db: DB, ministryId?: string) {
    let query = db
      .from("expense_settlements")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING")

    if (ministryId) {
      const { data: intentions } = await db
        .from("budget_intentions")
        .select("id")
        .eq("ministry_id", ministryId)
      if (intentions && intentions.length > 0) {
        query = query.in(
          "intention_id",
          intentions.map((i) => i.id)
        )
      }
    }

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }
}
