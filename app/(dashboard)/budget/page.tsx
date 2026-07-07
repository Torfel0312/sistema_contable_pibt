import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { budgetService } from "@/services/budget/budget.service"
import { ministriesService } from "@/services/ministries/ministries.service"
import { BudgetClient } from "@/components/budget/budget-client"
import { FEATURES } from "@/lib/feature-flags"

export default async function BudgetPage() {
  if (!FEATURES.budget) redirect("/dashboard")

  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_BUDGETS)) redirect("/dashboard")

  const db = await createSupabaseServerClient()
  const [periods, ministries] = await Promise.all([
    budgetService.listPeriods(db),
    ministriesService.list(db)
  ])

  return <BudgetClient initialPeriods={periods} ministries={ministries} />
}
