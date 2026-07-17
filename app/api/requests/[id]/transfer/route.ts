import { NextResponse } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can, isMinisterWorkflowUser } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { registerTransferSchema } from "@/lib/validators/intention"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (
    !user ||
    (!can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS) &&
      !isMinisterWorkflowUser(user.permissions))
  ) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const db = await createSupabaseServerClient()
  const data = await intentionsService.getTransfer(db, id)
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.REVIEW_INTENTIONS)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body: unknown = await request.json()
    const parsed = registerTransferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = await createSupabaseServerClient()
    const data = await intentionsService.registerTransfer(db, id, parsed.data, user.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
