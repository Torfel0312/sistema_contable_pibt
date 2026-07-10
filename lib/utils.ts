import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | Date): string {
  // Date-only strings (YYYY-MM-DD) must be parsed as local midnight, not UTC midnight,
  // to avoid showing the previous day in negative-offset timezones.
  const d =
    value instanceof Date
      ? value
      : typeof value === "string" && value.length === 10
        ? new Date(`${value}T00:00`)
        : new Date(value)
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function toDateInput(value: string | Date): string {
  if (typeof value === "string" && value.length === 10) return value
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
})

export function formatCLP(amount: number): string {
  return clpFormatter.format(amount)
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

export function toMovementFormValues(row: {
  movement_date: string
  movement_type: string
  amount: number | string
  category: string
  concept: string
  reference_person?: string | null
  received_by?: string | null
  delivered_by?: string | null
  beneficiary?: string | null
  payment_method?: string | null
  support_number?: string | null
  notes?: string | null
}) {
  return {
    movement_date: row.movement_date.slice(0, 10),
    movement_type: row.movement_type as "INCOME" | "EXPENSE",
    amount: Number(row.amount),
    category: row.category,
    concept: row.concept,
    reference_person: row.reference_person ?? null,
    received_by: row.received_by ?? null,
    delivered_by: row.delivered_by ?? null,
    beneficiary: row.beneficiary ?? null,
    payment_method: row.payment_method ?? null,
    support_number: row.support_number ?? null,
    notes: row.notes ?? null
  }
}
