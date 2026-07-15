import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import type { UpdateSettingsInput } from "@/lib/validators/settings"

type DB = SupabaseClient<Database>

export type AppSettings = {
  tesoreria_notification_email: string
  voucher_email: string
  notifications_from_email: string
  notifications_bcc_email: string
  reminder_interval_days: number
}

export const settingsService = {
  async getAll(db: DB): Promise<AppSettings> {
    const { data, error } = await db.from("app_settings").select("key, value")
    if (error) throw error

    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]))
    return {
      tesoreria_notification_email: map["tesoreria_notification_email"] ?? "",
      voucher_email: map["voucher_email"] ?? "",
      notifications_from_email: map["notifications_from_email"] ?? "",
      notifications_bcc_email: map["notifications_bcc_email"] ?? "",
      reminder_interval_days: parseInt(map["reminder_interval_days"] ?? "2", 10)
    }
  },

  async update(db: DB, input: UpdateSettingsInput, userId: string) {
    const now = new Date().toISOString()

    const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [
      string,
      string | number
    ][]

    await db.from("app_settings").upsert(
      entries.map(([key, value]) => ({
        key,
        value: String(value),
        updated_by: userId,
        updated_at: now
      })),
      { onConflict: "key" }
    )

    await auditService.logSystem({
      entity: "APP_SETTINGS",
      action: "SETTINGS_UPDATED",
      user_id: userId,
      new_value: input
    })

    return this.getAll(db)
  }
}
