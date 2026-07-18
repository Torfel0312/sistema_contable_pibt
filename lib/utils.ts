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

// Deterministic avatar chip color/initials for entities without a stored color
// (ministries, requests) — same name always maps to the same palette color.
const AVATAR_PALETTE = ["#5b4df2", "#9a4dff", "#0dbd8b", "#ffb020"]

export function avatarColorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}
