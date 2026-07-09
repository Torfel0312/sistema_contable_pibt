import { z } from "zod"

const localPartSchema = z
  .string()
  .min(1, "Requerido")
  .max(64, "Máximo 64 caracteres")
  .regex(/^[a-z0-9._-]+$/, "Solo minúsculas, números, puntos, guiones y guiones bajos")

export const createInboundEmailRouteSchema = z.object({
  local_part: localPartSchema,
  user_id: z.string().uuid("ID de usuario inválido")
})

export type CreateInboundEmailRouteInput = z.infer<typeof createInboundEmailRouteSchema>

export const renameInboundMailboxGroupSchema = z.object({
  old_local_part: z.string().min(1),
  new_local_part: localPartSchema
})

export type RenameInboundMailboxGroupInput = z.infer<typeof renameInboundMailboxGroupSchema>
