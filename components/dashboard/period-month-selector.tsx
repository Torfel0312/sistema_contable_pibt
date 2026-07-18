"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn, toDateInput } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic"
]

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

function yearRange(year: number): { from: string; to: string } {
  return { from: toDateInput(new Date(year, 0, 1)), to: toDateInput(new Date(year, 11, 31)) }
}

function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toDateInput(new Date(year, month, 1)),
    to: toDateInput(lastDayOfMonth(year, month))
  }
}

export function PeriodMonthSelector({
  defaultFrom,
  defaultTo
}: {
  defaultFrom?: string
  defaultTo?: string
}) {
  const router = useRouter()

  const now = new Date()
  const fromDate = defaultFrom ? new Date(`${defaultFrom}T00:00`) : undefined
  const selectedYear = fromDate ? fromDate.getFullYear() : now.getFullYear()

  // A single selected month looks like [year-month-01, year-month-lastDay] —
  // anything else (including no filter at all) is treated as "todo el año".
  const toDate = defaultTo ? new Date(`${defaultTo}T00:00`) : undefined
  const isSingleMonth =
    fromDate &&
    toDate &&
    fromDate.getDate() === 1 &&
    toDate.getFullYear() === fromDate.getFullYear() &&
    toDate.getMonth() === fromDate.getMonth() &&
    toDate.getDate() === lastDayOfMonth(fromDate.getFullYear(), fromDate.getMonth()).getDate()
  const selectedMonth = isSingleMonth ? fromDate.getMonth() : null

  function goTo(range: { from: string; to: string }) {
    router.push(`/dashboard?from=${range.from}&to=${range.to}`)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() =>
            goTo(selectedMonth !== null ? monthRange(selectedYear - 1, selectedMonth) : yearRange(selectedYear - 1))
          }
          aria-label="Año anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="w-12 text-center text-sm font-semibold tabular-nums">{selectedYear}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() =>
            goTo(selectedMonth !== null ? monthRange(selectedYear + 1, selectedMonth) : yearRange(selectedYear + 1))
          }
          aria-label="Año siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => goTo(yearRange(selectedYear))}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            selectedMonth === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          Todo el año
        </button>
        {MONTH_LABELS.map((label, month) => (
          <button
            key={label}
            type="button"
            onClick={() => goTo(monthRange(selectedYear, month))}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              selectedMonth === month
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
