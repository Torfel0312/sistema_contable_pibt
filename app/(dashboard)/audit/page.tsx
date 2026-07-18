import { redirect } from "next/navigation"
import { formatDateTime } from "@/lib/utils"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { auditService } from "@/services/audit/audit.service"
import { AuditTable, type SerializedAuditEvent } from "@/components/audit/audit-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function resolveHrefs(
  db: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  events: Awaited<ReturnType<typeof auditService.listSystem>>
) {
  const settlementIds = events
    .filter((event) => event.entity === "EXPENSE_SETTLEMENT" && event.entity_id)
    .map((event) => event.entity_id as string)

  let settlementToIntention = new Map<string, string>()
  if (settlementIds.length) {
    const { data } = await db
      .from("expense_settlements")
      .select("id, intention_id")
      .in("id", settlementIds)
    settlementToIntention = new Map((data ?? []).map((row) => [row.id, row.intention_id]))
  }

  return (entity: string, entityId: string | null): string | null => {
    if (!entityId) return null
    switch (entity) {
      case "MINISTRY":
      case "MINISTRY_ASSIGNMENT":
        return `/ministries/${entityId}`
      case "BUDGET_INTENTION":
      case "INTENTION_TRANSFER":
        return `/requests/${entityId}`
      case "EXPENSE_SETTLEMENT": {
        const intentionId = settlementToIntention.get(entityId)
        return intentionId ? `/requests/${intentionId}` : null
      }
      default:
        return null
    }
  }
}

export default async function AuditPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_USERS)) {
    redirect("/dashboard")
  }

  const db = await createSupabaseServerClient()
  const events = await auditService.listSystem(50)
  const getHref = await resolveHrefs(db, events)

  const rows: SerializedAuditEvent[] = events.map((event) => ({
    id: event.id,
    event_date_display: formatDateTime(event.event_date),
    entity: event.entity,
    action: event.action,
    note: event.note,
    user_name: event.users?.full_name ?? null,
    impersonator_name: event.impersonator?.full_name ?? null,
    href: getHref(event.entity, event.entity_id),
    previous_value: event.previous_value,
    new_value: event.new_value
  }))

  return (
    <section className="mx-auto max-w-6xl flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Auditoría
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de auditoría del sistema — usuarios y eventos globales.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-border">
          <CardTitle className="text-xl">Registro de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AuditTable rows={rows} />
        </CardContent>
      </Card>
    </section>
  )
}
