import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_FROM_EMAIL } from "@/services/email/resend.service"
import { inboundRoutesService } from "@/services/email/inbound-routes.service"
import { settingsService } from "@/services/settings/settings.service"

const DOMAIN = "pibtalcahuano.com"

export async function POST(request: Request) {
  const payload = await request.text()
  const resend = new Resend(process.env.RESEND_API_KEY)

  let event: {
    type: string
    data: { email_id: string; to?: string[]; cc?: string[]; bcc?: string[] }
  }
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? ""
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!
    }) as typeof event
  } catch {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 })
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true })
  }

  try {
    const addresses = [
      ...(event.data.to ?? []),
      ...(event.data.cc ?? []),
      ...(event.data.bcc ?? [])
    ]

    const localParts = [
      ...new Set(
        addresses
          .filter((address) => address.toLowerCase().endsWith(`@${DOMAIN}`))
          .map((address) => address.split("@")[0].toLowerCase())
      )
    ]

    if (localParts.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const admin = createSupabaseAdminClient()
    const recipientLists = await Promise.all(
      localParts.map((localPart) => inboundRoutesService.findByLocalPart(admin, localPart))
    )
    const recipients = [...new Set(recipientLists.flat())]

    if (recipients.length === 0) {
      console.warn(`[resend-inbound] no route configured for local-part(s) "${localParts.join(", ")}"`)
      return NextResponse.json({ ok: true })
    }

    const settings = await settingsService.getAll(admin)
    const from = settings.notifications_from_email || DEFAULT_FROM_EMAIL

    const { error } = await resend.emails.receiving.forward({
      emailId: event.data.email_id,
      to: recipients,
      from
    })

    if (error) {
      console.error(`[resend-inbound] forward failed for "${localParts.join(", ")}"`, error)
    }
  } catch (err) {
    console.error("[resend-inbound] unexpected error handling inbound email", err)
  }

  return NextResponse.json({ ok: true })
}
