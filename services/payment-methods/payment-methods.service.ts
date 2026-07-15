import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput
} from "@/lib/validators/payment-method"

type DB = SupabaseClient<Database>

export const paymentMethodsService = {
  async list(db: DB) {
    const { data, error } = await db.from("payment_methods").select("*").order("name").limit(500)
    if (error) throw error
    return data
  },

  async create(db: DB, input: CreatePaymentMethodInput, userId: string) {
    const { data, error } = await db
      .from("payment_methods")
      .insert({
        name: input.name,
        created_by: userId
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "PAYMENT_METHOD",
      action: "PAYMENT_METHOD_CREATED",
      user_id: userId,
      entity_id: data.id,
      new_value: { name: data.name }
    })

    return data
  },

  async update(db: DB, id: string, input: UpdatePaymentMethodInput, userId: string) {
    const { data, error } = await db
      .from("payment_methods")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "PAYMENT_METHOD",
      action: "PAYMENT_METHOD_UPDATED",
      user_id: userId,
      entity_id: id,
      new_value: input
    })

    return data
  }
}
