import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import type { CreateInboundEmailRouteInput } from "@/lib/validators/inbound-email-route"

type DB = SupabaseClient<Database>

export type InboundEmailRoute = {
  id: string
  local_part: string
  user_id: string
  users: { full_name: string; email: string } | null
}

export const inboundRoutesService = {
  async list(db: DB): Promise<InboundEmailRoute[]> {
    const { data, error } = await db
      .from("inbound_email_routes")
      .select("id, local_part, user_id, users!user_id(full_name, email)")
      .order("local_part", { ascending: true })

    if (error) throw error
    return data as unknown as InboundEmailRoute[]
  },

  async create(db: DB, input: CreateInboundEmailRouteInput, actorId: string) {
    const { data, error } = await db
      .from("inbound_email_routes")
      .insert({
        local_part: input.local_part,
        user_id: input.user_id,
        created_by: actorId
      })
      .select("id, local_part, user_id")
      .single()

    if (error) throw error

    await auditService.logSystem({
      entity: "INBOUND_EMAIL_ROUTE",
      action: "ROUTE_CREATED",
      entity_id: data.id,
      user_id: actorId,
      new_value: { local_part: input.local_part, user_id: input.user_id }
    })

    return data
  },

  async remove(db: DB, id: string, actorId: string) {
    const { data: existing, error: fetchError } = await db
      .from("inbound_email_routes")
      .select("local_part, user_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw fetchError

    const { error } = await db.from("inbound_email_routes").delete().eq("id", id)
    if (error) throw error

    await auditService.logSystem({
      entity: "INBOUND_EMAIL_ROUTE",
      action: "ROUTE_DELETED",
      entity_id: id,
      user_id: actorId,
      previous_value: existing ?? null
    })
  },

  async findByLocalPart(adminDb: DB, localPart: string): Promise<string[]> {
    const { data, error } = await adminDb
      .from("inbound_email_routes")
      .select("users!user_id(email)")
      .eq("local_part", localPart)

    if (error) throw error

    return (data as unknown as { users: { email: string } | null }[])
      .map((row) => row.users?.email)
      .filter((email): email is string => Boolean(email))
  }
}
