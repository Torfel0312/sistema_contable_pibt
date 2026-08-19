import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { auditService } from "@/services/audit/audit.service"
import { sendMovementEmail } from "@/services/email/resend.service"
import type { EmailSendResult, MovementIntegrationPayload } from "@/services/google/types"

function toPayload(m: {
  id: string
  movement_date: string
  movement_type: "INCOME" | "EXPENSE"
  amount: number
  category_name: string
  delivered_by: string | null
  receipt_email: string | null
  notes: string | null
  created_at: string
  created_by: { full_name: string; email: string }
  payment_method_label: string | null
}): MovementIntegrationPayload {
  return {
    movementId: m.id,
    movementTypeLabel: m.movement_type === "INCOME" ? "INGRESO" : "EGRESO",
    movementDate: m.movement_date,
    amount: Number(m.amount),
    category: m.category_name,
    deliveredBy: m.delivered_by,
    paymentMethodLabel: m.payment_method_label,
    receiptEmail: m.receipt_email,
    notes: m.notes,
    registeredBy: m.created_by.full_name,
    user: m.created_by.full_name,
    registeredEmail: m.created_by.email,
    registeredAt: m.created_at,
    organizationName: "Sistema contable PIBT"
  }
}

export async function processMovementIntegrations(movementId: string, userId: string) {
  const admin = createSupabaseAdminClient()

  const { data: movement, error } = await admin
    .from("movements")
    .select(
      "*, created_by:users!created_by_id(full_name, email), movement_categories:category_id(name)"
    )
    .eq("id", movementId)
    .single()

  if (error || !movement) throw new Error("Movement not found for integration")

  const created_by = movement.created_by as { full_name: string; email: string }
  const category = movement.movement_categories as { name: string } | null

  let paymentMethodLabel: string | null = null
  if (movement.payment_method_id) {
    const { data: paymentMethod } = await admin
      .from("payment_methods")
      .select("name")
      .eq("id", movement.payment_method_id)
      .maybeSingle()
    paymentMethodLabel = paymentMethod?.name ?? null
  }

  const payload = toPayload({
    ...movement,
    created_by,
    category_name: category?.name ?? "",
    payment_method_label: paymentMethodLabel
  })

  const mail = await sendMovementEmail(payload).catch(
    (mailError): EmailSendResult => ({
      ok: false,
      error: String(mailError)
    })
  )

  // mailSent: false with ok: true means there was nothing to send to (no
  // NOTIFICATION_EMAIL configured) — distinct from an actual send failure.
  const status = !mail.ok ? "ERROR" : mail.mailSent === false ? "SKIPPED" : "SENT"

  await admin
    .from("movements")
    .update({
      notification_status: status,
      notification_sent_at: status === "SENT" ? new Date().toISOString() : null,
      notification_error: mail.ok ? null : (mail.error ?? "Fallo envío correo")
    })
    .eq("id", movementId)

  const auditMessages: Record<typeof status, { action: string; note: string }> = {
    SENT: { action: "Notificación enviada", note: "Correo de notificación enviado exitosamente" },
    SKIPPED: {
      action: "Notificación omitida",
      note: "No se envió correo (sin destinatario configurado o el movimiento no lo requiere)"
    },
    ERROR: { action: "Error de notificación", note: `Error al enviar correo: ${mail.error ?? ""}` }
  }

  await auditService.logMovement({
    movement_id: movementId,
    user_id: userId,
    ...auditMessages[status]
  })
}
