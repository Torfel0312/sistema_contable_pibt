import { z } from "zod"

export const createInboundEmailRouteSchema = z.object({
  local_part: z
    .string()
    .min(1, "Requerido")
    .max(64, "Máximo 64 caracteres")
    .regex(/^[a-z0-9._-]+$/, "Solo minúsculas, números, puntos, guiones y guiones bajos"),
  user_id: z.string().uuid("ID de usuario inválido")
})

export type CreateInboundEmailRouteInput = z.infer<typeof createInboundEmailRouteSchema>
