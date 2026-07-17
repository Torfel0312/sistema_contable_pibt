"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AUDIT_ENTITY_LABEL, auditActionLabel, auditEntityLabel } from "@/lib/constants/audit"
import { AuditDiff } from "./audit-diff"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemHeader
} from "@/components/ui/item"
import { ClipboardList } from "lucide-react"

export type SerializedAuditEvent = {
  id: string
  // Pre-formatted server-side (not the raw ISO value) to avoid an SSR/client hydration
  // mismatch: Node's and the browser's Intl engines can render es-CL AM/PM time strings
  // with different whitespace, so the same Date must not be formatted on both sides.
  event_date_display: string
  entity: string
  action: string
  note: string | null
  user_name: string | null
  href: string | null
  previous_value: unknown
  new_value: unknown
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  )
}

export function AuditTable({ rows }: { rows: SerializedAuditEvent[] }) {
  const [selected, setSelected] = useState<SerializedAuditEvent | null>(null)

  return (
    <>
      <div className="hidden sm:block overflow-x-auto px-6 pb-6">
        <table className="min-w-full text-sm" aria-label="Registro de auditoría">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-4 font-bold text-[11px] uppercase tracking-[0.2em] text-muted-foreground text-left align-middle"
              >
                Fecha
              </th>
              <th
                scope="col"
                className="px-4 py-4 font-bold text-[11px] uppercase tracking-[0.2em] text-muted-foreground text-left align-middle"
              >
                Acción
              </th>
              <th
                scope="col"
                className="px-4 py-4 font-bold text-[11px] uppercase tracking-[0.2em] text-muted-foreground text-left align-middle"
              >
                Usuario
              </th>
              <th
                scope="col"
                className="px-4 py-4 font-bold text-[11px] uppercase tracking-[0.2em] text-muted-foreground text-left align-middle"
              >
                Observación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((event, index) => (
              <tr
                key={event.id}
                tabIndex={0}
                onClick={() => setSelected(event)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(event)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                )}
              >
                <td className="px-4 py-4 align-middle whitespace-nowrap text-muted-foreground font-medium tabular-nums text-xs">
                  {event.event_date_display}
                </td>
                <td className="px-4 py-4 align-middle font-bold text-foreground text-sm">
                  {auditActionLabel(event.action)}
                </td>
                <td className="px-4 py-4 align-middle text-muted-foreground font-medium text-sm">
                  {event.user_name ?? "—"}
                </td>
                <td className="px-4 py-4 align-middle text-muted-foreground italic truncate max-w-xs text-xs">
                  {event.note ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden px-4 pb-4">
        <ItemGroup>
          {rows.map((event) => (
            <Item
              key={event.id}
              variant="muted"
              size="sm"
              role="button"
              tabIndex={0}
              onClick={() => setSelected(event)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(event)}
              className="cursor-pointer"
            >
              <ItemContent>
                <ItemHeader>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {event.event_date_display}
                  </span>
                </ItemHeader>
                <ItemTitle>{auditActionLabel(event.action)}</ItemTitle>
                <ItemDescription>
                  {event.user_name ?? "—"}
                  {event.note && <span className="italic"> · {event.note}</span>}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </div>

      {!rows.length && (
        <Empty className="border-0 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Sin eventos</EmptyTitle>
            <EmptyDescription>No hay eventos de auditoría registrados.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        {selected && (
          <DialogContent className="w-[95vw] sm:max-w-lg bg-card p-0 border border-border rounded-xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              <DialogHeader>
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    {auditActionLabel(selected.action)}
                  </DialogTitle>
                  {AUDIT_ENTITY_LABEL[selected.entity.toUpperCase()] && (
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-muted text-muted-foreground">
                      {auditEntityLabel(selected.entity)}
                    </span>
                  )}
                </div>
                <DialogDescription className="sr-only">
                  Detalle del evento de auditoría
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Fecha" value={selected.event_date_display} />
                <Field label="Usuario" value={selected.user_name} />
              </div>

              {selected.note && (
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Observación
                  </p>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {selected.note}
                  </p>
                </div>
              )}

              <AuditDiff previous={selected.previous_value} next={selected.new_value} />

              {selected.href && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="h-10 px-5"
                    render={<Link href={selected.href} />}
                    nativeButton={false}
                  >
                    Ver {auditEntityLabel(selected.entity).toLowerCase()}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
