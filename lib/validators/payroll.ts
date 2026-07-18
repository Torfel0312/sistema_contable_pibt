import { z } from "zod"
import { attachmentInputSchema } from "@/lib/validators/movement"

export const payrollLineSchema = z.object({
  title: z.string().min(1, "Ingresa un título"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  movement_date: z.string().date("La fecha no tiene un formato válido"),
  delivered_by: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachments: z.array(attachmentInputSchema).max(10, "Máximo 10 adjuntos").optional().default([])
})

export const createPayrollSchema = z.object({
  period: z.string().date("La fecha no tiene un formato válido"),
  liquidacion: attachmentInputSchema,
  lines: z
    .array(payrollLineSchema)
    .min(1, "Agrega al menos una transferencia")
    .max(20, "Máximo 20 transferencias por registro")
})

export const severanceAdjustmentSchema = z.object({
  period: z.string().date("La fecha no tiene un formato válido"),
  amount_delta: z.number().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  note: z.string().min(3, "Indica un motivo para el ajuste")
})

export type PayrollLineInput = z.infer<typeof payrollLineSchema>
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>
export type SeveranceAdjustmentInput = z.infer<typeof severanceAdjustmentSchema>
