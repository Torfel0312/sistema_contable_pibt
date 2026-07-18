import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import type { SeveranceAdjustmentInput } from "@/lib/validators/payroll"

type DB = SupabaseClient<Database>

export const severanceReserveService = {
  async getBalance(db: DB): Promise<number> {
    const { data, error } = await db.from("severance_reserve_adjustments").select("amount_delta")
    if (error) throw error
    return data.reduce((sum, row) => sum + Number(row.amount_delta), 0)
  },

  async listAdjustments(db: DB) {
    const { data, error } = await db
      .from("severance_reserve_adjustments")
      .select("*, users(id, full_name)")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async addAdjustment(db: DB, input: SeveranceAdjustmentInput, userId: string) {
    // period has a DB constraint requiring day 1 (month start) — normalize here
    // in case the client ever sends a mid-month date.
    const period = `${input.period.slice(0, 7)}-01`

    const { data, error } = await db
      .from("severance_reserve_adjustments")
      .insert({
        period,
        amount_delta: input.amount_delta,
        note: input.note,
        created_by_id: userId
      })
      .select("*, users(id, full_name)")
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "SEVERANCE_RESERVE",
      action: "SEVERANCE_RESERVE_ADJUSTED",
      user_id: userId,
      entity_id: data.id,
      new_value: { period, amount_delta: input.amount_delta, note: input.note }
    })

    return data
  }
}
