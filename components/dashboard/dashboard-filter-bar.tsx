"use client"

import { Funnel } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"

export function DashboardFilterBar({
  defaultFrom,
  defaultTo
}: {
  defaultFrom?: string
  defaultTo?: string
}) {
  return (
    <form action="/dashboard" className="flex items-center gap-2">
      <DateRangePicker
        fromName="from"
        toName="to"
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
        className="w-auto rounded-lg"
      />
      <Button type="submit" className="rounded-lg">
        <Funnel className="size-3.5" />
        Filtrar
      </Button>
    </form>
  )
}
