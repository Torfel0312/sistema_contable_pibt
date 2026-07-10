import { z } from "zod"

export const createMinistrySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional()
})

export const updateMinistrySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional()
})

export const assignMinisterSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  notes: z.string().optional()
})

export type CreateMinistryInput = z.infer<typeof createMinistrySchema>
export type UpdateMinistryInput = z.infer<typeof updateMinistrySchema>
export type AssignMinisterInput = z.infer<typeof assignMinisterSchema>
