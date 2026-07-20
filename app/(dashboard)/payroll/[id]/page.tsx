import { notFound, redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { payrollService } from "@/services/payroll/payroll.service"
import { severanceReserveService } from "@/services/payroll/severance-reserve.service"
import { PayrollDetailClient } from "@/components/payroll/payroll-detail-client"

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!(can(user?.permissions, PERMISSIONS.MANAGE_PAYROLL) ?? false)) {
    redirect("/dashboard")
  }

  const { id } = await params
  const db = await createSupabaseServerClient()

  const [record, adjustments] = await Promise.all([
    payrollService.getById(db, id).catch(() => null),
    severanceReserveService.listAdjustments(db)
  ])

  if (!record) notFound()

  const reserveForPeriod =
    adjustments.find((adj) => adj.period === record.period)?.amount_delta ?? null
  const fondoAcumulado = adjustments
    .filter((adj) => adj.period <= record.period)
    .reduce((sum, adj) => sum + Number(adj.amount_delta), 0)

  return (
    <PayrollDetailClient
      record={record}
      reserveForPeriod={reserveForPeriod !== null ? Number(reserveForPeriod) : null}
      fondoAcumulado={fondoAcumulado}
    />
  )
}
