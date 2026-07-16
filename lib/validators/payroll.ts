import { z } from "zod"
import { attachmentInputSchema } from "@/lib/validators/movement"

export const payrollLineSchema = z.object({
  kind: z.enum(["SALARY", "CONTRIBUTIONS", "OTHER"]),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  movement_date: z.string().date("La fecha no tiene un formato válido"),
  delivered_by: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachments: z.array(attachmentInputSchema).max(10, "Máximo 10 adjuntos").optional().default([])
})

export const createPayrollSchema = z.object({
  period: z.string().date("La fecha no tiene un formato válido"),
  liquidacion_reference: z.string().optional().nullable(),
  lines: z.array(payrollLineSchema).min(1, "Agrega al menos una transferencia")
})

export const severanceAdjustmentSchema = z.object({
  amount_delta: z.number().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  note: z.string().min(3, "Indica un motivo para el ajuste")
})

export type PayrollLineInput = z.infer<typeof payrollLineSchema>
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>
export type SeveranceAdjustmentInput = z.infer<typeof severanceAdjustmentSchema>
