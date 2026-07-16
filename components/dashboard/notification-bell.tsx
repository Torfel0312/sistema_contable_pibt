"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type NotificationItem = {
  type:
    | "INTENTION_APPROVED"
    | "SETTLEMENT_DRAFT"
    | "SETTLEMENT_RETURNED"
    | "INTENTIONS_PENDING"
    | "SETTLEMENTS_PENDING"
    | "MISSING_TRANSFERS"
  id?: string
  description?: string
  href: string
  count?: number
}

function getNotificationMessage(item: NotificationItem): string {
  switch (item.type) {
    case "INTENTION_APPROVED":
      return `Solicitud aprobada: ${item.description}`
    case "SETTLEMENT_DRAFT":
      return `Rendición sin enviar: ${item.description}`
    case "SETTLEMENT_RETURNED":
      return `Rendición devuelta para corrección: ${item.description}`
    case "INTENTIONS_PENDING":
      return `${item.count} solicitud(es) pendiente(s)`
    case "SETTLEMENTS_PENDING":
      return `${item.count} rendición(es) pendiente(s)`
    case "MISSING_TRANSFERS":
      return `${item.count} transferencia(s) sin registrar`
  }
}

export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((res) =>
        res.ok ? (res.json() as Promise<{ count?: number; items?: NotificationItem[] }>) : null
      )
      .then((data) => {
        if (!data) return
        setCount(data.count ?? 0)
        setItems(data.items ?? [])
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            aria-label="Notificaciones"
          >
            <Bell className="size-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 p-0">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">Sin pendientes</div>
        ) : (
          <ul className="divide-y">
            {items.map((item, i) => (
              <li key={i}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  {item.count !== undefined && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground mt-0.5">
                      {item.count > 9 ? "9+" : item.count}
                    </span>
                  )}
                  <span>{getNotificationMessage(item)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
