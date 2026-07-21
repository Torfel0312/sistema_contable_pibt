"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { CheckCheck, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type NotificationItem,
  getNotificationTitle,
  getNotificationDescription,
  getRelativeTime,
  getDayBucket,
  NOTIFICATION_META,
  itemKey,
  loadReadSet,
  saveReadSet
} from "@/lib/notifications"

const DAY_ORDER = ["Hoy", "Ayer", "Esta semana", "Anteriores"]

export function NotificationsPageClient() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [readKeys, setReadKeys] = useState<Set<string>>(() => loadReadSet())
  const [tab, setTab] = useState<"all" | "unread">("all")

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((res) =>
        res.ok ? (res.json() as Promise<{ items?: NotificationItem[] }>) : null
      )
      .then((data) => setItems(data?.items ?? []))
      .catch(() => null)
  }, [])

  useEffect(() => {
    fetchNotifications()
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

  const visibleItems = tab === "unread" ? items.filter((i) => !readKeys.has(itemKey(i))) : items

  const groups = useMemo(() => {
    const byDay = new Map<string, NotificationItem[]>()
    for (const item of visibleItems) {
      const day = getDayBucket(item.created_at)
      const list = byDay.get(day) ?? []
      list.push(item)
      byDay.set(day, list)
    }
    return DAY_ORDER.map((day) => ({ day, items: byDay.get(day) ?? [] })).filter(
      (g) => g.items.length > 0
    )
  }, [visibleItems])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            Notificaciones
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Actividad de tu cuenta y del sistema
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex h-10 items-center gap-1.5 rounded-full border border-input bg-card px-4 text-[12.5px] font-bold text-foreground hover:bg-muted transition-colors"
          >
            <CheckCheck className="size-3.5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "h-9 rounded-full px-4 text-[12.5px] font-bold transition-colors",
            tab === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:bg-muted"
          )}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={cn(
            "h-9 rounded-full px-4 text-[12.5px] font-bold transition-colors",
            tab === "unread"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:bg-muted"
          )}
        >
          No leídas{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </button>
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card border border-border px-6 py-16">
          <div className="flex size-16 items-center justify-center rounded-[18px] bg-muted">
            <BellOff className="size-[26px] text-faint" />
          </div>
          <div className="text-center">
            <p className="mb-1 text-[15px] font-bold">Todo al día</p>
            <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
              No tienes notificaciones. Te avisaremos apenas haya novedades en tu cuenta.
            </p>
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.day}>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
              {group.day}
            </p>
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {group.items.map((item, i) => {
                const meta = NOTIFICATION_META[item.type]
                const Icon = meta.icon
                const isUnread = !readKeys.has(itemKey(item))
                const time = getRelativeTime(item.created_at)
                return (
                  <Link
                    key={itemKey(item) + i}
                    href={item.href}
                    className="flex gap-3.5 px-5 py-4 border-t border-border first:border-t-0 hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex size-[38px] shrink-0 items-center justify-center rounded-[11px]",
                        meta.tile
                      )}
                    >
                      <Icon className={cn("size-[17px]", meta.icon_cls)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-[13.5px] font-bold">{getNotificationTitle(item)}</p>
                      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                        {getNotificationDescription(item)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end text-right">
                      {time && (
                        <p className="text-[11.5px] font-semibold text-faint">{time}</p>
                      )}
                      {isUnread && <span className="mt-1.5 size-2 rounded-full bg-primary" />}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
