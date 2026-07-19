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
import { PeriodMonthSelector } from "@/components/dashboard/period-month-selector"
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
    <div className="flex flex-col max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-[22px]">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mb-1">
            Dashboard
          </h1>
          <p className="text-[13.5px] text-muted-foreground">Resumen financiero de actividades</p>
        </div>

        {/* Date filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
            Período
          </Label>
          <PeriodMonthSelector defaultFrom={from} defaultTo={to} />
        </div>
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5 ${
          canViewFinanceWidgets && data.severanceBalance !== null ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {/* Hero — saldo actual */}
        <div className="rounded-[18px] bg-primary px-5 py-[18px] flex flex-col text-primary-foreground">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-primary-foreground/70 mb-[10px]">
            Saldo actual
          </p>
          <p className="font-heading text-[26px] font-extrabold tracking-tight tabular-nums mb-3">
            {formatCLP(data.kpis.currentBalance)}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-[9px] py-[3px] text-[11.5px] font-semibold">
              <TrendingUp className="size-3" />
              {formatCLP(data.kpis.totalIncome)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-[9px] py-[3px] text-[11.5px] font-semibold">
              <TrendingDown className="size-3" />
              {formatCLP(data.kpis.totalExpense)}
            </span>
          </div>
        </div>

        {/* Income */}
        <div className="rounded-[18px] bg-card border border-border px-5 py-[18px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-faint">
              Ingresos
            </p>
            <div className="flex size-[26px] items-center justify-center rounded-[8px] bg-income-surface">
              <TrendingUp className="size-3.5 text-income" />
            </div>
          </div>
          <p className="font-heading text-2xl font-extrabold tracking-tight text-foreground tabular-nums mb-1.5">
            {formatCLP(data.kpis.totalIncome)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.kpis.movementCount} movimientos en el período
          </p>
        </div>

        {/* Expenses */}
        <div className="rounded-[18px] bg-card border border-border px-5 py-[18px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-faint">
              Egresos
            </p>
            <div className="flex size-[26px] items-center justify-center rounded-[8px] bg-expense-surface">
              <TrendingDown className="size-3.5 text-expense" />
            </div>
          </div>
          <p className="font-heading text-2xl font-extrabold tracking-tight text-foreground tabular-nums mb-1.5">
            {formatCLP(data.kpis.totalExpense)}
          </p>
          <p className="text-xs text-muted-foreground">En el período seleccionado</p>
        </div>

        {canViewFinanceWidgets && data.severanceBalance !== null && (
          <SeveranceReserveCard balance={data.severanceBalance} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3.5 mb-3.5">
        <div className="rounded-[14px] bg-card border border-border px-5 py-[18px] flex flex-col">
          <h2 className="font-heading text-[14px] font-bold tracking-tight text-foreground mb-0.5">
            Ingresos vs Egresos
          </h2>
          <p className="text-xs text-muted-foreground mb-3.5">Tendencia por período</p>
          <IncomeExpenseChart data={data.incomeExpenseSeries} />
        </div>
        <div className="rounded-[14px] bg-card border border-border px-5 py-[18px] flex flex-col">
          <h2 className="font-heading text-[14px] font-bold tracking-tight text-foreground mb-0.5">
            Por categoría
          </h2>
          <p className="text-xs text-muted-foreground mb-3.5">Distribución del período</p>
          <CategoryChart data={data.categoryBreakdown} />
        </div>
      </div>

      {canViewFinanceWidgets && data.ministryLeftoverTotals && (
        <div className="mb-3.5">
          <MinistryLeftoverWidget totals={data.ministryLeftoverTotals} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[15px] font-bold tracking-tight text-foreground">
            Últimos movimientos
          </h2>
          <Link
            href="/movements"
            className="text-[12.5px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
        <div className="rounded-[14px] bg-card border border-border overflow-hidden">
          <MovementsTable
            canWrite={canWrite}
            rows={data.recentMovements.map((row) => ({
              id: row.id,
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
