import { pdf } from "@react-pdf/renderer"
import { Resend } from "resend"

import { VoucherDocument } from "@/components/vouchers/voucher-document"
import { ReceiptConfirmationEmail } from "@/emails/receipt-confirmation-email"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_FROM_EMAIL } from "@/services/email/resend.service"
import type { EmailSendResult, MovementIntegrationPayload } from "@/services/google/types"
import { settingsService } from "@/services/settings/settings.service"

export async function renderVoucherPdf(movement: MovementIntegrationPayload): Promise<Buffer> {
  const stream = await pdf(VoucherDocument({ movement })).toBuffer()

  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

async function buildVoucherPayload(movementId: string): Promise<MovementIntegrationPayload> {
  const admin = createSupabaseAdminClient()

  const { data: movement, error } = await admin
    .from("movements")
    .select(
      "*, created_by:users!created_by_id(full_name, email), movement_categories:category_id(name)"
    )
    .eq("id", movementId)
    .single()

  if (error || !movement) throw new Error("Movement not found for voucher")

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

  return {
    movementId: movement.id,
    folio: movement.folio_display ?? "",
    movementTypeLabel: movement.movement_type === "INCOME" ? "INGRESO" : "EGRESO",
    movementDate: movement.movement_date,
    amount: Number(movement.amount),
    category: category?.name ?? "",
    deliveredBy: movement.delivered_by,
    paymentMethodLabel,
    receiptEmail: movement.receipt_email,
    notes: movement.notes,
    registeredBy: created_by.full_name,
    user: created_by.full_name,
    registeredEmail: created_by.email,
    registeredAt: movement.created_at,
    organizationName: "Sistema contable PIBT"
  }
}

export async function sendVoucherEmail(
  movementId: string,
  toEmail: string,
  opts?: { bcc?: string }
): Promise<EmailSendResult> {
  const payload = await buildVoucherPayload(movementId)
  const pdfBuffer = await renderVoucherPdf(payload)

  const settings = await settingsService.getAll(createSupabaseAdminClient())
  const from = settings.notifications_from_email || DEFAULT_FROM_EMAIL

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    ...(opts?.bcc ? { bcc: opts.bcc } : {}),
    subject: `Comprobante — Folio ${payload.folio}`,
    react: ReceiptConfirmationEmail({ movement: payload }),
    attachments: [
      {
        filename: `comprobante-${payload.folio}.pdf`,
        content: pdfBuffer
      }
    ]
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, mailSent: true }
}
