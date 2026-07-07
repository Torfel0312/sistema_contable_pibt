import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { ministriesService } from "@/services/ministries/ministries.service"
import { budgetService } from "@/services/budget/budget.service"
import { IntentionsClient } from "@/components/intentions/intentions-client"
import { FEATURES } from "@/lib/feature-flags"

export default async function RequestsPage() {
  if (!FEATURES.requests) redirect("/dashboard")

  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.VIEW_WORKFLOW)) redirect("/dashboard")

  const db = await createSupabaseServerClient()

  if (can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    const assignment = await ministriesService.getMinistryForUser(db, user.id)
    const activePeriod = await budgetService.getActivePeriod(db)

    const budgetSummary =
      assignment && activePeriod
        ? await budgetService.getBudgetSummary(assignment.ministry_id, activePeriod.id)
        : null

    const intentions = assignment
      ? await intentionsService.list(db, { ministryId: assignment.ministry_id })
      : []

    return (
      <IntentionsClient
        canSubmit={true}
        intentions={intentions}
        ministry={assignment?.ministries ?? null}
        budgetSummary={budgetSummary}
        activePeriod={activePeriod}
      />
    )
  }

  const intentions = await intentionsService.list(db)

  return (
    <IntentionsClient
      canSubmit={false}
      intentions={intentions}
      ministry={null}
      budgetSummary={null}
      activePeriod={null}
    />
  )
}
