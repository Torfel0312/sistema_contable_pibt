import Link from "next/link"
import { redirect } from "next/navigation"
import { dashboardService } from "@/services/dashboard/dashboard.service"
import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { IncomeExpenseChart, CategoryChart } from "@/components/dashboard/dashboard-charts"
import { SeveranceReserveCard } from "@/components/dashboard/severance-reserve-card"
import { MinistryLeftoverWidget } from "@/components/dashboard/ministry-leftover-widget"
import { MovementsTable } from "@/components/movements/movements-table"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatCLP } from "@/lib/utils"

type DashboardSearchParams = {
  from?: string
  to?: string
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<DashboardSearchParams>
}) {
  const from = (await searchParams)?.from
  const to = (await searchParams)?.to
  const user = await getCurrentUser()
  if (!user) redirect("/")
  if (!can(user.permissions, PERMISSIONS.VIEW_DASHBOARD)) redirect("/requests")
  const canWrite = can(user?.permissions, PERMISSIONS.CREATE_MOVEMENT) ?? false
  const canViewFinanceWidgets = can(user?.permissions, PERMISSIONS.VIEW_MOVEMENT) ?? false
  const data = await dashboardService.getSummary(
    { from, to },
    { includeFinanceWidgets: canViewFinanceWidgets }
  )

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Resumen financiero de actividades</p>
        </div>

        {/* Date filter */}
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
              Período
            </Label>
            <DateRangePicker fromName="from" toName="to" defaultFrom={from} defaultTo={to} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" className="h-9 px-4 text-sm">
              Filtrar
            </Button>
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              variant="ghost"
              className="h-9 px-4 text-sm"
            >
              Limpiar
            </Button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Hero — saldo actual */}
        <div className="rounded-xl bg-primary p-6 flex flex-col gap-3 text-primary-foreground">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
            Saldo actual
          </p>
          <p className="font-heading text-3xl font-bold tracking-tight tabular-nums">
            {formatCLP(data.kpis.currentBalance)}
          </p>
          <div className="flex flex-wrap gap-3 mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <TrendingUp className="size-3" />
              {formatCLP(data.kpis.totalIncome)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <TrendingDown className="size-3" />
              {formatCLP(data.kpis.totalExpense)}
            </span>
          </div>
        </div>

        {/* Income */}
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Ingresos
            </p>
            <TrendingUp className="size-4 text-income" />
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-income tabular-nums">
            {formatCLP(data.kpis.totalIncome)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.kpis.movementCount} movimientos en el período
          </p>
        </div>

        {/* Expenses */}
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Egresos
            </p>
            <TrendingDown className="size-4 text-destructive" />
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-destructive tabular-nums">
            {formatCLP(data.kpis.totalExpense)}
          </p>
          <p className="text-xs text-muted-foreground">En el período seleccionado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Ingresos vs Egresos
            </h2>
            <p className="text-xs text-muted-foreground">Tendencia por período</p>
          </div>
          <IncomeExpenseChart data={data.incomeExpenseSeries} />
        </div>
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Por categoría
            </h2>
            <p className="text-xs text-muted-foreground">Distribución del período</p>
          </div>
          <CategoryChart data={data.categoryBreakdown} />
        </div>
      </div>

      {canViewFinanceWidgets && data.severanceBalance !== null && data.ministryLeftoverTotals && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeveranceReserveCard balance={data.severanceBalance} />
          <MinistryLeftoverWidget totals={data.ministryLeftoverTotals} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Últimos movimientos
          </h2>
          <Link
            href="/movements"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <MovementsTable
            canWrite={canWrite}
            rows={data.recentMovements.map((row) => ({
              id: row.id,
              folio_display: row.folio_display,
              movement_date: row.movement_date,
              movement_type: row.movement_type,
              amount: String(row.amount),
              category_name:
                (row.movement_categories as { name: string } | null)?.name ?? "—",
              subcategory_name:
                (row.movement_subcategories as { name: string } | null)?.name ?? null,
              delivered_by: null,
              receipt_email: null,
              payment_method_name: null,
              notes: null,
              cancellation_reason: null,
              status: row.status,
              created_by: {
                full_name: (row.created_by as { full_name: string } | null)?.full_name ?? ""
              }
            }))}
          />
        </div>
      </div>
    </div>
  )
}
