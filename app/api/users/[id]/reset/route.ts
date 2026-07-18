import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can, isImpersonating } from "@/lib/permissions/rbac"
import { usersService } from "@/services/users/users.service"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_USERS) || isImpersonating(user)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    await usersService.resetAccount(id, user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 400 })
  }
}
