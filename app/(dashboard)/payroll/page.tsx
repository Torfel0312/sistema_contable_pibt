import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { payrollService } from "@/services/payroll/payroll.service"
import { severanceReserveService } from "@/services/payroll/severance-reserve.service"
import { PayrollClient } from "@/components/payroll/payroll-client"

export default async function PayrollPage() {
  const user = await getCurrentUser()
  if (!(can(user?.permissions, PERMISSIONS.MANAGE_PAYROLL) ?? false)) {
    redirect("/dashboard")
  }

  const db = await createSupabaseServerClient()
  const [records, severanceBalance, severanceAdjustments] = await Promise.all([
    payrollService.list(db),
    severanceReserveService.getBalance(db),
    severanceReserveService.listAdjustments(db)
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mb-1">
          Remuneraciones
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Registro mensual de remuneraciones del pastor y reserva de indemnización.
        </p>
      </div>
      <PayrollClient
        records={records}
        severanceBalance={severanceBalance}
        severanceAdjustments={severanceAdjustments}
      />
    </div>
  )
}
