import { NextResponse } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { canAccessWorkflow, isMinisterWorkflowUser } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { settlementsService } from "@/services/settlements/settlements.service"
import { ministriesService } from "@/services/ministries/ministries.service"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !canAccessWorkflow(user.permissions)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const db = await createSupabaseServerClient()

  if (isMinisterWorkflowUser(user.permissions)) {
    const assignment = await ministriesService.getMinistryForUser(db, user.id)
    if (!assignment) return NextResponse.json({ count: 0, items: [] })

    // Only DRAFT and RETURNED_FOR_CORRECTION need the minister's own action — PENDING and
    // IN_REVIEW are already out of their hands, waiting on tesorería.
    const [intentionsPending, settlementsDraft, settlementsReturned] = await Promise.all([
      intentionsService.list(db, { ministryId: assignment.ministry_id, status: "APPROVED" }),
      settlementsService.list(db, { status: "DRAFT", submittedBy: user.id }),
      settlementsService.list(db, { status: "RETURNED_FOR_CORRECTION", submittedBy: user.id })
    ])

    const items = [
      ...intentionsPending.map((i) => ({
        type: "INTENTION_APPROVED" as const,
        id: i.id,
        description: i.purpose,
        href: `/requests/${i.id}`,
        created_at: i.updated_at
      })),
      ...settlementsDraft.map((s) => ({
        type: "SETTLEMENT_DRAFT" as const,
        id: s.id,
        description: s.description,
        href: `/requests/${s.intention_id}`,
        created_at: s.created_at
      })),
      ...settlementsReturned.map((s) => ({
        type: "SETTLEMENT_RETURNED" as const,
        id: s.id,
        description: s.description,
        href: `/requests/${s.intention_id}`,
        created_at: s.created_at
      }))
    ]

    return NextResponse.json({ count: items.length, items })
  }

  const [intentionCount, settlementCount, missingTransfers] = await Promise.all([
    intentionsService.getPendingCount(db),
    settlementsService.getPendingCount(db),
    intentionsService.getMissingTransfersCount(db)
  ])

  const count = intentionCount + settlementCount + missingTransfers
  return NextResponse.json({
    count,
    items: [
      intentionCount > 0
        ? { type: "INTENTIONS_PENDING", count: intentionCount, href: "/requests?status=PENDING" }
        : null,
      settlementCount > 0
        ? {
            type: "SETTLEMENTS_PENDING",
            count: settlementCount,
            href: "/requests?tab=settlements&status=PENDING"
          }
        : null,
      missingTransfers > 0
        ? { type: "MISSING_TRANSFERS", count: missingTransfers, href: "/requests?tab=transfers" }
        : null
    ].filter(Boolean)
  })
}
