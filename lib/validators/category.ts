import { z } from "zod"

export const createCategorySchema = z.object({
  movement_type: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional()
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
})

export const createSubcategorySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional()
})

export const updateSubcategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>
