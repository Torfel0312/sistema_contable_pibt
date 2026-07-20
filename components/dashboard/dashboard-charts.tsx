"use client"

import { memo, useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis
} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import { formatCLP } from "@/lib/utils"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { BarChart2, PieChart as PieChartIcon, TrendingUp as TrendUpIcon } from "lucide-react"

type SeriesItem = { name: string; income: number; expense: number }
type CategoryItem = { category: string; total: number }

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)"
]

const incomeExpenseConfig = {
  income: {
    label: "Ingresos",
    color: "var(--color-primary)"
  },
  expense: {
    label: "Egresos",
    color: "var(--color-destructive)"
  }
} satisfies ChartConfig

export const IncomeExpenseChart = memo(function IncomeExpenseChart({
  data
}: {
  data: SeriesItem[]
}) {
  if (!data.length) {
    return (
      <Empty className="border-dashed h-[300px] sm:h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart2 />
          </EmptyMedia>
          <EmptyTitle>Sin datos</EmptyTitle>
          <EmptyDescription>No hay movimientos en el período seleccionado.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="h-[300px] sm:h-72 w-full">
      <ChartContainer config={incomeExpenseConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--outline-variant) / 0.3)"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={11}
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={5}
              fontSize={11}
              width={40}
              stroke="var(--color-muted-foreground)"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--on-surface-variant) / 0.05)" }}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              content={({ payload }) => (
                <div className="flex justify-end gap-4 sm:gap-6 mb-6">
                  {payload?.map((entry, index) => {
                    const key = entry.dataKey as keyof typeof incomeExpenseConfig
                    const label = incomeExpenseConfig[key]?.label ?? entry.value
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            />
            <Bar
              dataKey="income"
              name="Ingresos"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="expense"
              name="Egresos"
              fill="var(--color-expense)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
})

const balanceConfig = {
  balance: {
    label: "Saldo",
    color: "var(--color-primary)"
  }
} satisfies ChartConfig

export const BalanceHistoryChart = memo(function BalanceHistoryChart({
  data
}: {
  data: SeriesItem[]
}) {
  const balanceSeries = useMemo(() => {
    let running = 0
    return data.map((item) => {
      running += item.income - item.expense
      return { name: item.name, balance: running }
    })
  }, [data])

  if (!balanceSeries.length) {
    return (
      <Empty className="border-dashed h-[150px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendUpIcon />
          </EmptyMedia>
          <EmptyTitle>Sin datos</EmptyTitle>
          <EmptyDescription>No hay movimientos en el período seleccionado.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="h-[150px] w-full">
      <ChartContainer config={balanceConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={balanceSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--outline-variant) / 0.3)"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={10.5}
              fontWeight={700}
              stroke="var(--color-faint)"
            />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <ChartTooltip
              cursor={{ stroke: "var(--color-primary)", strokeDasharray: "3 3" }}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="var(--color-primary)"
              fill="url(#balanceFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
})

export const CategoryChart = memo(function CategoryChart({ data }: { data: CategoryItem[] }) {
  const grandTotal = useMemo(() => data.reduce((sum, item) => sum + item.total, 0), [data])

  if (!data.length) {
    return (
      <Empty className="border-dashed h-[200px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PieChartIcon />
          </EmptyMedia>
          <EmptyTitle>Sin categorías</EmptyTitle>
          <EmptyDescription>No hay datos para el período seleccionado.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col justify-between gap-2 h-[170px] w-full min-w-0">
      {data.map((item, index) => {
        const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
        return (
          <div key={item.category}>
            <div className="flex items-baseline justify-between gap-2.5 mb-1">
              <span className="text-xs font-semibold text-foreground min-w-0 truncate">
                {item.category}
              </span>
              <span className="text-[11.5px] font-bold text-muted-foreground whitespace-nowrap">
                {formatCLP(item.total)}{" "}
                <span className="text-faint font-semibold">· {pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
})
