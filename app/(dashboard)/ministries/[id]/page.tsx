import { notFound, redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { ministriesService } from "@/services/ministries/ministries.service"
import { ministryLeftoverService } from "@/services/ministries/ministry-leftover.service"
import { intentionsService } from "@/services/intentions/intentions.service"
import { usersService } from "@/services/users/users.service"
import { MinistryDetailClient } from "@/components/ministries/ministry-detail-client"

export default async function MinistryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_MINISTRIES)) redirect("/dashboard")

  const { id } = await params
  const db = await createSupabaseServerClient()

  const [ministry, assignments, users, leftover, intentions, associatedMovements] = await Promise.all([
    ministriesService.getById(db, id).catch(() => null),
    ministriesService.getAssignments(db, id),
    usersService.list(),
    ministryLeftoverService.getSummary(id),
    intentionsService.list(db, { ministryId: id }),
    ministriesService.getAssociatedMovements(db, id)
  ])

  if (!ministry) notFound()

  const currentAssignment = assignments.find((a) => a.unassigned_at === null) ?? null

  return (
    <MinistryDetailClient
      ministry={ministry}
      users={users}
      assignments={assignments as Parameters<typeof MinistryDetailClient>[0]["assignments"]}
      currentAssignment={currentAssignment as Parameters<typeof MinistryDetailClient>[0]["currentAssignment"]}
      leftover={leftover}
      intentions={intentions as Parameters<typeof MinistryDetailClient>[0]["intentions"]}
      associatedMovements={
        associatedMovements as Parameters<typeof MinistryDetailClient>[0]["associatedMovements"]
      }
    />
  )
}
