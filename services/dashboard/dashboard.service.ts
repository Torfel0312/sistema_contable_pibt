import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { severanceReserveService } from "@/services/payroll/severance-reserve.service"
import { ministryLeftoverService } from "@/services/ministries/ministry-leftover.service"

type SeriesItem = { name: string; income: number; expense: number }
type CategoryItem = { category: string; total: number }
type MinistryLeftoverTotal = { ministry_id: string; ministry_name: string; leftover: number }

type DashboardPeriod = {
  from?: string
  to?: string
}

type RpcResult = {
  totalIncome: number
  totalExpense: number
  movementCount: number
  series: Array<{ month: string; income: number; expense: number }>
  categoryBreakdown: Array<{ category: string; total: number }>
}

// Converts 'YYYY-MM' ISO month string to Spanish short locale label ("ene. 26").
function formatMonthES(isoMonth: string): string {
  const [year, month] = isoMonth.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("es-CL", { month: "short", year: "2-digit" })
}

export const dashboardService = {
  // includeFinanceWidgets gates the severance-reserve + ministry-leftover data —
  // both are ADMIN/BURSAR/FINANCE-only (Etapa 8), so callers pass this only when
  // the current user actually holds VIEW_MOVEMENT. Never compute/fetch this data
  // for a viewer who won't see it (MINISTER).
  async getSummary(period: DashboardPeriod = {}, options: { includeFinanceWidgets?: boolean } = {}) {
    const admin = createSupabaseAdminClient()

    const pFrom = period.from || undefined
    const pTo = period.to || undefined

    const [rpcResponse, recentResponse, severanceBalance, leftoverRows] = await Promise.all([
      admin.rpc("get_dashboard_summary", { p_from: pFrom, p_to: pTo }),
      admin
        .from("movements")
        .select(
          "id, movement_date, movement_type, amount, status, created_by:users!created_by_id(full_name), movement_categories:category_id(name), movement_subcategories:subcategory_id(name)"
        )
        .eq("status", "ACTIVE")
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8),
      options.includeFinanceWidgets ? severanceReserveService.getBalance(admin) : Promise.resolve(null),
      options.includeFinanceWidgets ? ministryLeftoverService.getSummary() : Promise.resolve(null)
    ])

    if (rpcResponse.error) throw rpcResponse.error
    if (recentResponse.error) throw recentResponse.error

    const summary = rpcResponse.data as unknown as RpcResult

    const incomeExpenseSeries: SeriesItem[] = summary.series.map((s) => ({
      name: formatMonthES(s.month),
      income: Number(s.income),
      expense: Number(s.expense)
    }))

    const ministryLeftoverTotals: MinistryLeftoverTotal[] | null = leftoverRows
      ? Object.values(
          leftoverRows.reduce<Record<string, MinistryLeftoverTotal>>((acc, row) => {
            const existing = acc[row.ministry_id]
            acc[row.ministry_id] = {
              ministry_id: row.ministry_id,
              ministry_name: row.ministry_name,
              leftover: (existing?.leftover ?? 0) + row.leftover
            }
            return acc
          }, {})
        ).sort((a, b) => b.leftover - a.leftover)
      : null

    return {
      kpis: {
        totalIncome: Number(summary.totalIncome),
        totalExpense: Number(summary.totalExpense),
        currentBalance: Number(summary.totalIncome) - Number(summary.totalExpense),
        movementCount: Number(summary.movementCount)
      },
      incomeExpenseSeries,
      categoryBreakdown: summary.categoryBreakdown.map(
        (c): CategoryItem => ({
          category: c.category,
          total: Number(c.total)
        })
      ),
      recentMovements: recentResponse.data,
      severanceBalance,
      ministryLeftoverTotals
    }
  }
}
