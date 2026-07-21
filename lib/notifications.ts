import {
  CheckCircle2,
  Clock,
  FileText,
  RotateCcw,
  TriangleAlert,
  type LucideIcon
} from "lucide-react"

export type NotificationType =
  | "INTENTION_APPROVED"
  | "SETTLEMENT_DRAFT"
  | "SETTLEMENT_RETURNED"
  | "INTENTIONS_PENDING"
  | "SETTLEMENTS_PENDING"
  | "MISSING_TRANSFERS"

export type NotificationItem = {
  type: NotificationType
  id?: string
  description?: string
  href: string
  count?: number
  created_at?: string
}

export function getNotificationTitle(item: NotificationItem): string {
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

export function getNotificationDescription(item: NotificationItem): string {
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

export function getRelativeTime(isoDate?: string): string | null {
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

// Which day-group bucket a notification falls into, for the full notifications
// page's "Hoy / Ayer / Esta semana / Anteriores" grouping. Undated items
// (the count-based aggregate ones, e.g. INTENTIONS_PENDING) always read as "now".
export function getDayBucket(isoDate?: string): string {
  if (!isoDate) return "Hoy"
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) return "Hoy"
  if (days === 1) return "Ayer"
  if (days < 7) return "Esta semana"
  return "Anteriores"
}

export const NOTIFICATION_META: Record<
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
export function itemKey(item: NotificationItem): string {
  return item.id ? `${item.type}:${item.id}` : item.type
}

const READ_STORAGE_KEY = "holly-money:read-notifications"

export function loadReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function saveReadSet(keys: Set<string>) {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...keys]))
  } catch {
    // best-effort — read-tracking is a nicety, not a source of truth
  }
}
