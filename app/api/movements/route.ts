import { NextResponse, after } from "next/server"
import { createMovementSchema, movementFiltersSchema } from "@/lib/validators/movement"
import { movementsService } from "@/services/movements/movements.service"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { processMovementIntegrations } from "@/services/google/movement-postprocess"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.VIEW_MOVEMENT)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = movementFiltersSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid filters", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const db = await createSupabaseServerClient()
  const { data } = await movementsService.list(db, {
    search: parsed.data.search,
    movement_type: parsed.data.movement_type,
    status: parsed.data.status
  })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: unknown = await request.json()
    const parsed = createMovementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = await createSupabaseServerClient()
    const created = await movementsService.create(db, parsed.data, user.id)
    // Run external integrations after response. Movement stays saved on failure.
    // notify_by_email already governs notification_status on the row itself
    // (movementsService.create) — skip the actual send to match, same as the
    // createMovement server action.
    if (created.notify_by_email) {
      after(async () => {
        try {
          await processMovementIntegrations(created.id, user.id)
        } catch (error) {
          console.error("processMovementIntegrations failed", { movementId: created.id, error })
        }
      })
    }
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
