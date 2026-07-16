import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type MinistryLeftoverRow = {
  ministry_id: string
  ministry_name: string
  intention_id: string
  purpose: string
  transferred_amount: number
  settled_amount: number
  leftover: number
}

export const ministryLeftoverService = {
  async getSummary(ministryId?: string, asOf?: string): Promise<MinistryLeftoverRow[]> {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.rpc("get_ministry_leftover_summary", {
      // Generated Args type says `string | undefined` (Postgres UUID params with a
      // DEFAULT aren't marked nullable by the codegen), but the RPC's own default is
      // NULL, which is exactly what "all ministries" means here.
      p_ministry_id: (ministryId ?? null) as string | undefined,
      p_as_of: asOf ?? new Date().toISOString().slice(0, 10)
    })
    if (error) throw error
    return (data ?? []) as unknown as MinistryLeftoverRow[]
  }
}
