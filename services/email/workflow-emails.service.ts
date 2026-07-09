import { Resend } from "resend"

import { IntentionNotificationEmail } from "@/emails/intention-notification-email"
import { IntentionReviewEmail } from "@/emails/intention-review-email"
import { ReminderEmail } from "@/emails/reminder-email"
import { SettlementReviewEmail } from "@/emails/settlement-review-email"
import { TransferNotificationEmail } from "@/emails/transfer-notification-email"
import { settingsService } from "@/services/settings/settings.service"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const ORG_SHORT = "Sistema Contable PIBT"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Sistema contable PIBT <hola@pibtalcahuano.com>"
const UNSUBSCRIBE_EMAIL = "hola@pibtalcahuano.com"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const TRANSACTIONAL_HEADERS = {
  "List-Unsubscribe": `<mailto:${UNSUBSCRIBE_EMAIL}?subject=unsubscribe>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  "X-Entity-Ref-ID": "sistema-contable-pibt"
}

export async function sendIntentionNotification(intention: {
  id: string
  amount: number
  description: string
  token: string
}): Promise<void> {
  const settings = await settingsService.getAll(createSupabaseAdminClient())
  const to = settings.tesoreria_notification_email
  if (!to) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Nueva solicitud de presupuesto — ${ORG_SHORT}`,
    react: IntentionNotificationEmail({
      intention,
      reviewUrl: `${BASE_URL}/requests/${intention.id}`
    }),
    headers: TRANSACTIONAL_HEADERS
  })
}

export async function sendIntentionReviewNotification(
  intention: { id: string; amount: number; description: string },
  minister: { email: string; full_name: string },
  action: "APPROVED" | "REJECTED"
): Promise<void> {
  const settings = await settingsService.getAll(createSupabaseAdminClient())
  const to = settings.voucher_email || minister.email
  const resend = new Resend(process.env.RESEND_API_KEY)

  const statusLabel = action === "APPROVED" ? "aprobada" : "rechazada"

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Solicitud ${statusLabel} — ${ORG_SHORT}`,
    react: IntentionReviewEmail({
      intention,
      minister,
      action,
      detailUrl: `${BASE_URL}/requests/${intention.id}`
    }),
    headers: TRANSACTIONAL_HEADERS
  })
}

export async function sendTransferNotification(
  intention: { id: string; amount: number; description: string },
  minister: { email: string; full_name: string }
): Promise<void> {
  const settings = await settingsService.getAll(createSupabaseAdminClient())
  const to = settings.voucher_email || minister.email
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Transferencia registrada — ${ORG_SHORT}`,
    react: TransferNotificationEmail({
      intention,
      minister,
      detailUrl: `${BASE_URL}/requests/${intention.id}`
    }),
    headers: TRANSACTIONAL_HEADERS
  })
}

export async function sendSettlementReviewNotification(
  settlement: { id: string; amount: number; description: string },
  minister: { email: string; full_name: string },
  action: "APPROVED" | "REJECTED"
): Promise<void> {
  const settings = await settingsService.getAll(createSupabaseAdminClient())
  const to = settings.voucher_email || minister.email
  const resend = new Resend(process.env.RESEND_API_KEY)

  const statusLabel = action === "APPROVED" ? "aprobada" : "rechazada"

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Rendición ${statusLabel} — ${ORG_SHORT}`,
    react: SettlementReviewEmail({
      settlement,
      minister,
      action,
      detailUrl: `${BASE_URL}/requests/${settlement.id}`
    }),
    headers: TRANSACTIONAL_HEADERS
  })
}

export async function sendReminderEmail(summary: {
  intentions: number
  settlements: number
  missing_transfers: number
}): Promise<void> {
  const settings = await settingsService.getAll(createSupabaseAdminClient())
  const to = settings.tesoreria_notification_email
  if (!to) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const total = summary.intentions + summary.settlements + summary.missing_transfers

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `[Recordatorio] ${total} items pendientes — ${ORG_SHORT}`,
    react: ReminderEmail({ summary, dashboardUrl: `${BASE_URL}/requests` }),
    headers: TRANSACTIONAL_HEADERS
  })
}
