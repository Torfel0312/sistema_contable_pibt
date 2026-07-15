"use server"

import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { voucherEmailSchema } from "@/lib/validators/voucher"
import { sendVoucherEmail } from "@/services/vouchers/voucher.service"

export async function emailVoucher(
  movementId: string,
  toEmail: string
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    return { error: "Sin permisos para enviar comprobantes" }
  }

  const parsed = voucherEmailSchema.safeParse({ toEmail })
  if (!parsed.success) {
    return { error: "Correo inválido" }
  }

  const result = await sendVoucherEmail(movementId, parsed.data.toEmail)
  if (!result.ok) {
    return { error: result.error ?? "No se pudo enviar el comprobante" }
  }

  return { ok: true }
}
