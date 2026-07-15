import { z } from "zod"

export const voucherEmailSchema = z.object({
  toEmail: z.string().email("Correo inválido")
})

export type VoucherEmailInput = z.infer<typeof voucherEmailSchema>
