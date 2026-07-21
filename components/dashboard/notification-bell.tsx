"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  RotateCcw,
  TriangleAlert,
  type LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type NotificationType =
  | "INTENTION_APPROVED"
  | "SETTLEMENT_DRAFT"
  | "SETTLEMENT_RETURNED"
  | "INTENTIONS_PENDING"
  | "SETTLEMENTS_PENDING"
  | "MISSING_TRANSFERS"

type NotificationItem = {
  type: NotificationType
  id?: string
  description?: string
  href: string
  count?: number
  created_at?: string
}

function getNotificationTitle(item: NotificationItem): string {
  switch (item.type) {
    case "INTENTION_APPROVED":
      return "Solicitud aprobada"
    case "SETTLEMENT_DRAFT":
      return "Rendición sin enviar"
    case "SETTLEMENT_RETURNED":
      return "Rendición devuelta para corrección"
    case "INTENTIONS_PENDING":
      return "Solicitudes pendientes"
    case "SETTLEMENTS_PENDING":
      return "Rendiciones pendientes"
    case "MISSING_TRANSFERS":
      return "Transferencias sin registrar"
  }
}

function getNotificationDescription(item: NotificationItem): string {
  switch (item.type) {
    case "INTENTION_APPROVED":
    case "SETTLEMENT_DRAFT":
    case "SETTLEMENT_RETURNED":
      return item.description ?? ""
    case "INTENTIONS_PENDING":
      return `${item.count} solicitud(es) pendiente(s)`
    case "SETTLEMENTS_PENDING":
      return `${item.count} rendición(es) pendiente(s)`
    case "MISSING_TRANSFERS":
      return `${item.count} transferencia(s) sin registrar`
  }
}

function getRelativeTime(isoDate?: string): string | null {
  if (!isoDate) return null
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Hace instantes"
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`
  return new Date(isoDate).toLocaleDateString("es-CL")
}

const NOTIFICATION_META: Record<
  NotificationType,
  { icon: LucideIcon; tile: string; icon_cls: string }
> = {
  INTENTION_APPROVED: { icon: CheckCircle2, tile: "bg-income-surface", icon_cls: "text-on-income" },
  SETTLEMENT_DRAFT: { icon: FileText, tile: "bg-warn-surface", icon_cls: "text-on-warn" },
  SETTLEMENT_RETURNED: { icon: RotateCcw, tile: "bg-warn-surface", icon_cls: "text-on-warn" },
  INTENTIONS_PENDING: { icon: Clock, tile: "bg-primary-surface", icon_cls: "text-primary" },
  SETTLEMENTS_PENDING: { icon: Clock, tile: "bg-primary-surface", icon_cls: "text-primary" },
  MISSING_TRANSFERS: { icon: TriangleAlert, tile: "bg-expense-surface", icon_cls: "text-on-expense" }
}

// Notifications are derived on every request from live intention/settlement rows —
// there's no dedicated notifications table to persist per-item read state against.
// A stable per-item key + a locally-persisted read-set is the lightweight
// equivalent: "unread" just means "not in the set the user last acknowledged."
function itemKey(item: NotificationItem): string {
  return item.id ? `${item.type}:${item.id}` : item.type
}

const READ_STORAGE_KEY = "holly-money:read-notifications"

function loadReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveReadSet(keys: Set<string>) {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...keys]))
  } catch {
    // best-effort — read-tracking is a nicety, not a source of truth
  }
}

export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [readKeys, setReadKeys] = useState<Set<string>>(() => loadReadSet())
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

  const unreadCount = useMemo(
    () => items.filter((item) => !readKeys.has(itemKey(item))).length,
    [items, readKeys]
  )

  const markAllRead = useCallback(() => {
    setReadKeys((prev) => {
      const next = new Set(prev)
      items.forEach((item) => next.add(itemKey(item)))
      saveReadSet(next)
      return next
    })
  }, [items])

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
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold">Notificaciones</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-expense-surface px-2 py-0.5 text-[10.5px] font-extrabold text-on-expense">
                {unreadCount} nueva{unreadCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-[11.5px] font-bold text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Marcar todas
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center px-7 pt-10 pb-[34px] text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
              <BellOff className="size-6 text-faint" />
            </div>
            <p className="mb-1 text-sm font-bold">Todo al día</p>
            <p className="max-w-[240px] text-[12.5px] leading-[1.5] text-muted-foreground">
              No tienes notificaciones nuevas por ahora. Te avisaremos apenas haya novedades.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item, i) => {
              const meta = NOTIFICATION_META[item.type]
              const Icon = meta.icon
              const isUnread = !readKeys.has(itemKey(item))
              const time = getRelativeTime(item.created_at)
              return (
                <li key={i}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-[18px] py-3.5 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-[10px]",
                        meta.tile
                      )}
                    >
                      <Icon className={cn("size-4", meta.icon_cls)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold">{getNotificationTitle(item)}</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {getNotificationDescription(item)}
                      </p>
                      {time && (
                        <p className="text-[11px] font-semibold text-muted-foreground/70 mt-1">
                          {time}
                        </p>
                      )}
                    </div>
                    {isUnread && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <div className="border-t border-border px-[18px] py-3 text-center">
          <Link
            href="/requests"
            onClick={() => setOpen(false)}
            className="text-[12.5px] font-bold text-primary hover:underline"
          >
            Ver todas las notificaciones →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
