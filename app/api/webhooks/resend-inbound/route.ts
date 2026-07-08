import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { inboundRoutesService } from "@/services/email/inbound-routes.service"
import { FROM_EMAIL } from "@/services/email/resend.service"

export async function POST(request: Request) {
  const payload = await request.text()
  const resend = new Resend(process.env.RESEND_API_KEY)

  let event: { type: string; data: { email_id: string; to: string[] } }
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

  const to = event.data.to[0]
  const localPart = to?.split("@")[0]?.toLowerCase()
  if (!localPart) {
    return NextResponse.json({ ok: true })
  }

  try {
    const admin = createSupabaseAdminClient()
    const recipients = await inboundRoutesService.findByLocalPart(admin, localPart)

    if (recipients.length === 0) {
      console.warn(`[resend-inbound] no route configured for local-part "${localPart}"`)
      return NextResponse.json({ ok: true })
    }

    const { error } = await resend.emails.receiving.forward({
      emailId: event.data.email_id,
      to: recipients,
      from: FROM_EMAIL
    })

    if (error) {
      console.error(`[resend-inbound] forward failed for "${localPart}"`, error)
    }
  } catch (err) {
    console.error(`[resend-inbound] unexpected error handling "${localPart}"`, err)
  }

  return NextResponse.json({ ok: true })
}
