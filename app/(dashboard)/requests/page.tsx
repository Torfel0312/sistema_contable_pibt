import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { ministriesService } from "@/services/ministries/ministries.service"
import { IntentionsClient } from "@/components/intentions/intentions-client"

export default async function RequestsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.VIEW_WORKFLOW)) redirect("/dashboard")

  const db = await createSupabaseServerClient()

  if (can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    const assignment = await ministriesService.getMinistryForUser(db, user.id)

    const intentions = assignment
      ? await intentionsService.list(db, { ministryId: assignment.ministry_id })
      : []

    return (
      <IntentionsClient
        canSubmit={true}
        intentions={intentions}
        ministry={assignment?.ministries ?? null}
      />
    )
  }

  const intentions = await intentionsService.list(db)

  return <IntentionsClient canSubmit={false} intentions={intentions} ministry={null} />
}
