import { z } from "zod"

export const startImpersonationSchema = z.object({
  targetUserId: z.string().min(1, "Usuario inválido")
})

export type StartImpersonationInput = z.infer<typeof startImpersonationSchema>
