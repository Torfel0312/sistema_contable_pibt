import { NextResponse, after } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { movementsService } from "@/services/movements/movements.service"
import { updateMovementSchema } from "@/lib/validators/movement"
import { processMovementIntegrations } from "@/services/google/movement-postprocess"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.VIEW_MOVEMENT)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const db = await createSupabaseServerClient()
  const row = await movementsService.findById(db, id)
  if (!row) {
    return NextResponse.json({ message: "Movement not found" }, { status: 404 })
  }

  return NextResponse.json(row)
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body: unknown = await request.json()
    const parsed = updateMovementSchema.safeParse({ ...(body as Record<string, unknown>), id })
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = await createSupabaseServerClient()
    const updated = await movementsService.update(db, id, parsed.data, user.id)
    if (updated.notify_by_email) {
      after(async () => {
        try {
          await processMovementIntegrations(updated.id, user.id)
        } catch (error) {
          console.error("processMovementIntegrations failed", { movementId: updated.id, error })
        }
      })
    }
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message.includes("not found") ? 404 : 400
    return NextResponse.json({ message }, { status })
  }
}
