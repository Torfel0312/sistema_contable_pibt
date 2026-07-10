import { NextResponse } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { canAccessWorkflow } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { addCommentSchema } from "@/lib/validators/intention"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !canAccessWorkflow(user.permissions)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const db = await createSupabaseServerClient()
  const data = await intentionsService.getComments(db, id, "INTENTION")
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !canAccessWorkflow(user.permissions)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body: unknown = await request.json()
    const parsed = addCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = await createSupabaseServerClient()
    const data = await intentionsService.addComment(db, id, "INTENTION", parsed.data, user.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
