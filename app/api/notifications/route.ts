import { NextResponse } from "next/server"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can, canAccessWorkflow } from "@/lib/permissions/rbac"
import { intentionsService } from "@/services/intentions/intentions.service"
import { settlementsService } from "@/services/settlements/settlements.service"
import { ministriesService } from "@/services/ministries/ministries.service"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !canAccessWorkflow(user.permissions)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const db = await createSupabaseServerClient()

  if (can(user.permissions, PERMISSIONS.SUBMIT_INTENTIONS)) {
    const assignment = await ministriesService.getMinistryForUser(db, user.id)
    if (!assignment) return NextResponse.json({ count: 0, items: [] })

    const [intentionsPending, settlementsPending] = await Promise.all([
      intentionsService.list(db, { ministryId: assignment.ministry_id, status: "APPROVED" }),
      settlementsService.list(db, { status: "PENDING", submittedBy: user.id })
    ])

    const items = [
      ...intentionsPending.map((i) => ({
        type: "INTENTION_APPROVED" as const,
        id: i.id,
        description: i.purpose,
        href: `/requests/${i.id}`,
        created_at: i.updated_at
      })),
      ...settlementsPending.map((s) => ({
        type: "SETTLEMENT_PENDING" as const,
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
