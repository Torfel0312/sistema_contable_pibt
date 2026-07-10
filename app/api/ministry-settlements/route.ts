import { NextResponse } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can, canAccessWorkflow } from "@/lib/permissions/rbac"
import { settlementsService } from "@/services/settlements/settlements.service"
import { createSettlementSchema, settlementFiltersSchema } from "@/lib/validators/settlement"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !canAccessWorkflow(user.permissions)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = settlementFiltersSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid filters", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const db = await createSupabaseServerClient()
  const data = await settlementsService.list(db, {
    intentionId: parsed.data.intention_id,
    status: parsed.data.status
  })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  if (!can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    return NextResponse.json({ message: "Only ministers can submit settlements" }, { status: 403 })
  }

  try {
    const body: unknown = await request.json()
    const parsed = createSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = await createSupabaseServerClient()
    const data = await settlementsService.create(db, parsed.data, user.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
