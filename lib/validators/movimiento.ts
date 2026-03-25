import { z } from "zod";

export const movimientoBaseSchema = z.object({
  fechaMovimiento: z.string().min(1, "La fecha es requerida"),
  tipoMovimiento: z.enum(["INGRESO", "EGRESO"]),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  categoria: z.string().min(1, "La categoria es requerida"),
  concepto: z.string().min(3, "El concepto es requerido"),
  referente: z.string().optional().nullable(),
  recibidoPor: z.string().optional().nullable(),
  entregadoPor: z.string().optional().nullable(),
  beneficiario: z.string().optional().nullable(),
  medioPago: z.string().optional().nullable(),
  numeroRespaldo: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export const createMovimientoSchema = movimientoBaseSchema;

export const updateMovimientoSchema = movimientoBaseSchema.extend({
  id: z.string().min(1),
});

export const anularMovimientoSchema = z.object({
  motivoAnulacion: z.string().min(3, "Debes indicar un motivo de anulacion"),
});

export type CreateMovimientoInput = z.infer<typeof createMovimientoSchema>;
export type UpdateMovimientoInput = z.infer<typeof updateMovimientoSchema>;
export type AnularMovimientoInput = z.infer<typeof anularMovimientoSchema>;
