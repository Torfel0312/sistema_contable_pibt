import { z } from "zod"
import {
  MIN_REQUEST_AMOUNT,
  MAX_REQUEST_AMOUNT,
  REQUEST_AMOUNT_MIN_MESSAGE,
  REQUEST_AMOUNT_MAX_MESSAGE
} from "@/lib/constants/requests"
import { attachmentInputSchema } from "@/lib/validators/movement"

export const createSettlementSchema = z.object({
  intention_id: z.string().uuid("Solicitud inválida"),
  amount: z.coerce
    .number()
    .min(MIN_REQUEST_AMOUNT, REQUEST_AMOUNT_MIN_MESSAGE)
    .max(MAX_REQUEST_AMOUNT, REQUEST_AMOUNT_MAX_MESSAGE),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  attachments: z.array(attachmentInputSchema).max(10, "Máximo 10 adjuntos").optional().default([]),
  isDraft: z.boolean().optional().default(false)
})

export const reviewSettlementSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED", "RETURNED_FOR_CORRECTION"]),
  message: z.string().min(1, "El mensaje es requerido")
})

export const settlementFiltersSchema = z.object({
  intention_id: z.string().uuid().optional(),
  status: z
    .enum(["DRAFT", "PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "RETURNED_FOR_CORRECTION", "CANCELLED"])
    .optional()
})

export const closeIntentionSchema = z.object({
  intention_id: z.string().uuid("Solicitud inválida"),
  attachments: z.array(attachmentInputSchema).min(1, "Adjunta al menos un comprobante").max(10, "Máximo 10 adjuntos")
})

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
export type ReviewSettlementInput = z.infer<typeof reviewSettlementSchema>
export type SettlementFilters = z.infer<typeof settlementFiltersSchema>
export type CloseIntentionInput = z.infer<typeof closeIntentionSchema>
