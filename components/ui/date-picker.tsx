"use client"

import * as React from "react"
import { es } from "date-fns/locale/es"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DatePicker({
  name,
  defaultValue,
  value,
  onChange,
  className
}: {
  name?: string
  defaultValue?: string
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
}) {
  const defaultDate = defaultValue ? new Date(defaultValue) : undefined
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(defaultDate)
  const date = value !== undefined ? value : internalDate
  const [month, setMonth] = React.useState<Date>(date ?? new Date())

  const handleSelect = (newDate: Date | undefined) => {
    setInternalDate(newDate)
    onChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setMonth(today)
    handleSelect(today)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal border-border bg-background hover:bg-muted overflow-hidden",
              !date && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? formatDate(date) : <span className="truncate">Seleccionar fecha</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover text-popover-foreground shadow-md rounded-xl overflow-hidden ring-1 ring-border">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          initialFocus
          locale={es}
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 20, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
          footer={
            <div className="flex justify-center border-t border-border pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={goToToday}>
                Hoy
              </Button>
            </div>
          }
        />
      </PopoverContent>
      {/* Hidden input to allow native form submission method="GET" */}
      <input
        type="hidden"
        name={name}
        value={
          date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            : ""
        }
      />
    </Popover>
  )
}
