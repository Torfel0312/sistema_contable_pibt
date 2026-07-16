import { z } from "zod"
import { attachmentInputSchema } from "@/lib/validators/movement"

export const REQUEST_AMOUNT_MIN = 10000
export const REQUEST_AMOUNT_MAX = 5000000

export const createIntentionSchema = z.object({
  amount: z.coerce
    .number()
    .min(REQUEST_AMOUNT_MIN, `El monto mínimo es $${REQUEST_AMOUNT_MIN.toLocaleString("es-CL")}`)
    .max(REQUEST_AMOUNT_MAX, `El monto máximo es $${REQUEST_AMOUNT_MAX.toLocaleString("es-CL")}`),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  purpose: z.string().optional(),
  date_needed: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido")
    .optional(),
  funding_method: z.enum(["REIMBURSEMENT", "TRANSFER"])
})

export const reviewIntentionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  message: z.string().min(1, "El mensaje es requerido")
})

export const registerTransferSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  transfer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(attachmentInputSchema).max(10, "Máximo 10 adjuntos").optional().default([])
})

export const addCommentSchema = z.object({
  message: z.string().min(1, "El comentario no puede estar vacío")
})

export const intentionFiltersSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  ministry_id: z.string().uuid().optional()
})

export type CreateIntentionInput = z.infer<typeof createIntentionSchema>
export type ReviewIntentionInput = z.infer<typeof reviewIntentionSchema>
export type RegisterTransferInput = z.infer<typeof registerTransferSchema>
export type AddCommentInput = z.infer<typeof addCommentSchema>
export type IntentionFilters = z.infer<typeof intentionFiltersSchema>
