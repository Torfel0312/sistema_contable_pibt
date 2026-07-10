"use client"

import * as React from "react"
import { es } from "date-fns/locale/es"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn, formatDate, toDateInput } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DateRangePicker({
  fromName,
  toName,
  defaultFrom,
  defaultTo,
  value,
  onChange,
  className
}: {
  fromName?: string
  toName?: string
  defaultFrom?: string
  defaultTo?: string
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  className?: string
}) {
  const defaultRange: DateRange | undefined = defaultFrom
    ? { from: new Date(`${defaultFrom}T00:00`), to: defaultTo ? new Date(`${defaultTo}T00:00`) : undefined }
    : undefined
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(defaultRange)
  const range = value !== undefined ? value : internalRange

  const handleSelect = (newRange: DateRange | undefined) => {
    setInternalRange(newRange)
    onChange?.(newRange)
  }

  const [month, setMonth] = React.useState<Date>(range?.from ?? new Date())
  const currentYear = new Date().getFullYear()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 text-left font-normal border-border bg-background hover:bg-muted overflow-hidden",
              !range?.from && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0" />
        {range?.from ? (
          range.to ? (
            <span className="truncate">
              {formatDate(range.from)} — {formatDate(range.to)}
            </span>
          ) : (
            <span className="truncate">{formatDate(range.from)}</span>
          )
        ) : (
          <span className="truncate">Seleccionar rango</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover text-popover-foreground shadow-md rounded-xl overflow-hidden ring-1 ring-border">
        <Calendar
          mode="range"
          month={month}
          onMonthChange={setMonth}
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={es}
          captionLayout="dropdown"
          startMonth={new Date(currentYear - 20, 0)}
          endMonth={new Date(currentYear + 1, 11)}
          footer={
            <div className="flex justify-center border-t border-border pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMonth(new Date())}>
                Hoy
              </Button>
            </div>
          }
        />
      </PopoverContent>
      <input type="hidden" name={fromName} value={range?.from ? toDateInput(range.from) : ""} />
      <input type="hidden" name={toName} value={range?.to ? toDateInput(range.to) : ""} />
    </Popover>
  )
}
