import { z } from "zod"

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, "El nombre es requerido")
})

export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1).optional(),
  is_active: z.boolean().optional()
})

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>
