import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import type {
  CreateMinistryInput,
  UpdateMinistryInput,
  AssignMinisterInput
} from "@/lib/validators/ministry"

type DB = SupabaseClient<Database>

export const ministriesService = {
  async list(db: DB) {
    const { data, error } = await db.from("ministries").select("*").order("name").limit(500)
    if (error) throw error
    return data
  },

  async getById(db: DB, id: string) {
    const { data, error } = await db.from("ministries").select("*").eq("id", id).single()
    if (error) throw error
    return data
  },

  async create(db: DB, input: CreateMinistryInput, userId: string) {
    const { data, error } = await db
      .from("ministries")
      .insert({
        name: input.name,
        description: input.description ?? null,
        created_by: userId
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MINISTRY",
      action: "MINISTRY_CREATED",
      user_id: userId,
      entity_id: data.id,
      new_value: { name: data.name }
    })

    return data
  },

  async update(db: DB, id: string, input: UpdateMinistryInput, userId: string) {
    const { data, error } = await db
      .from("ministries")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MINISTRY",
      action: "MINISTRY_UPDATED",
      user_id: userId,
      entity_id: id,
      new_value: input
    })

    return data
  },

  async listCurrentAssignments(db: DB) {
    const { data, error } = await db
      .from("ministry_assignments")
      .select("id, ministry_id, user_id, assigned_at, users!user_id(id, full_name, email)")
      .is("unassigned_at", null)
    if (error) throw error
    return data
  },

  async getAssignments(db: DB, ministryId: string) {
    const { data, error } = await db
      .from("ministry_assignments")
      .select("*, users!user_id(id, full_name, email)")
      .eq("ministry_id", ministryId)
      .order("assigned_at", { ascending: false })
    if (error) throw error
    return data
  },

  async getCurrentAssignment(db: DB, ministryId: string) {
    const { data, error } = await db
      .from("ministry_assignments")
      .select("*, users!user_id(id, full_name, email)")
      .eq("ministry_id", ministryId)
      .is("unassigned_at", null)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getMinistryForUser(db: DB, userId: string) {
    const { data, error } = await db
      .from("ministry_assignments")
      .select("*, ministries(*)")
      .eq("user_id", userId)
      .is("unassigned_at", null)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async assign(db: DB, ministryId: string, input: AssignMinisterInput, assignedBy: string) {
    // Close any existing active assignment
    await db
      .from("ministry_assignments")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("ministry_id", ministryId)
      .is("unassigned_at", null)

    const { data, error } = await db
      .from("ministry_assignments")
      .insert({
        ministry_id: ministryId,
        user_id: input.user_id,
        assigned_by: assignedBy,
        notes: input.notes ?? null
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MINISTRY_ASSIGNMENT",
      action: "MINISTER_ASSIGNED",
      user_id: assignedBy,
      entity_id: ministryId,
      new_value: { user_id: input.user_id, ministry_id: ministryId }
    })

    return data
  },

  async unassign(db: DB, ministryId: string, userId: string) {
    const { error } = await db
      .from("ministry_assignments")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("ministry_id", ministryId)
      .is("unassigned_at", null)
    if (error) throw error

    await auditService.logSystem({
      entity: "MINISTRY_ASSIGNMENT",
      action: "MINISTER_UNASSIGNED",
      user_id: userId,
      entity_id: ministryId,
      new_value: { ministry_id: ministryId }
    })
  }
}
