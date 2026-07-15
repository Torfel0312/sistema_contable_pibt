import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSubcategoryInput,
  UpdateSubcategoryInput
} from "@/lib/validators/category"

type DB = SupabaseClient<Database>

export const categoriesService = {
  async list(db: DB, movementType?: "INCOME" | "EXPENSE") {
    let query = db.from("movement_categories").select("*").order("name").limit(500)
    if (movementType) {
      query = query.eq("movement_type", movementType)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(db: DB, input: CreateCategoryInput, userId: string) {
    const { data, error } = await db
      .from("movement_categories")
      .insert({
        movement_type: input.movement_type,
        name: input.name,
        created_by: userId
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MOVEMENT_CATEGORY",
      action: "MOVEMENT_CATEGORY_CREATED",
      user_id: userId,
      entity_id: data.id,
      new_value: { name: data.name, movement_type: data.movement_type }
    })

    return data
  },

  async update(db: DB, id: string, input: UpdateCategoryInput, userId: string) {
    const { data: current, error: fetchError } = await db
      .from("movement_categories")
      .select("is_system")
      .eq("id", id)
      .single()
    if (fetchError) throw fetchError

    if (current.is_system && (input.is_active === false || input.name !== undefined)) {
      throw new Error("No se puede archivar una categoría del sistema")
    }

    const { data, error } = await db
      .from("movement_categories")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MOVEMENT_CATEGORY",
      action: "MOVEMENT_CATEGORY_UPDATED",
      user_id: userId,
      entity_id: id,
      new_value: input
    })

    return data
  }
}

export const subcategoriesService = {
  async list(db: DB, categoryId?: string) {
    let query = db.from("movement_subcategories").select("*").order("name").limit(500)
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(db: DB, input: CreateSubcategoryInput, userId: string) {
    const { data, error } = await db
      .from("movement_subcategories")
      .insert({
        category_id: input.category_id,
        name: input.name,
        created_by: userId
      })
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MOVEMENT_SUBCATEGORY",
      action: "MOVEMENT_SUBCATEGORY_CREATED",
      user_id: userId,
      entity_id: data.id,
      new_value: { name: data.name, category_id: data.category_id }
    })

    return data
  },

  async update(db: DB, id: string, input: UpdateSubcategoryInput, userId: string) {
    const { data, error } = await db
      .from("movement_subcategories")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    await auditService.logSystem({
      entity: "MOVEMENT_SUBCATEGORY",
      action: "MOVEMENT_SUBCATEGORY_UPDATED",
      user_id: userId,
      entity_id: id,
      new_value: input
    })

    return data
  }
}
