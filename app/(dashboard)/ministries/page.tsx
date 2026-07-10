import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { ministriesService } from "@/services/ministries/ministries.service"
import { usersService } from "@/services/users/users.service"
import { MinistriesClient } from "@/components/ministries/ministries-client"

export default async function MinistriesPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_MINISTRIES)) redirect("/dashboard")

  const db = await createSupabaseServerClient()
  const [ministries, currentAssignments, users] = await Promise.all([
    ministriesService.list(db),
    ministriesService.listCurrentAssignments(db),
    usersService.list()
  ])

  const ministers = users.filter((u) => u.role === "MINISTER")

  return (
    <MinistriesClient
      initialMinistries={ministries}
      initialCurrentAssignments={currentAssignments}
      ministers={ministers}
    />
  )
}
