"use client"

import { useState } from "react"
import Link from "next/link"
import { cn, formatDate, formatCLP } from "@/lib/utils"
import { CancelButton } from "./cancel-button"
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
  ItemHeader,
  ItemActions
} from "@/components/ui/item"
import { FileSearch } from "lucide-react"

export type SerializedMovement = {
  id: string
  folio_display: string
  movement_date: string
  movement_type: string
  amount: string
  category_name: string
  subcategory_name: string | null
  delivered_by: string | null
  receipt_email: string | null
  payment_method_name: string | null
  notes: string | null
  cancellation_reason: string | null
  status: string
  created_by: { full_name: string }
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

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso"
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  CANCELLED: "Anulado"
}

export function MovementsTable({
  rows,
  canWrite
}: {
  rows: SerializedMovement[]
  canWrite: boolean
}) {
  const [selected, setSelected] = useState<SerializedMovement | null>(null)

  return (
    <>
      <div className="sm:hidden">
        {rows.length === 0 ? (
          <Empty className="border-0 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearch />
              </EmptyMedia>
              <EmptyTitle>Sin resultados</EmptyTitle>
              <EmptyDescription>No hay registros para los filtros seleccionados.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {rows.map((row) => (
              <Item
                key={row.id}
                variant="muted"
                size="sm"
                role="button"
                tabIndex={0}
                onClick={() => setSelected(row)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(row)}
                className="cursor-pointer"
              >
                <ItemContent>
                  <ItemHeader>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                        row.movement_type === "INCOME"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {MOVEMENT_TYPE_LABEL[row.movement_type] ?? row.movement_type}
                    </span>
                  </ItemHeader>
                  <ItemTitle className="text-sm">
                    {row.category_name}
                    {row.subcategory_name && (
                      <span className="text-muted-foreground"> › {row.subcategory_name}</span>
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    {formatDate(row.movement_date)} ·{" "}
                    <span className="font-bold text-foreground tabular-nums">
                      {formatCLP(Number(row.amount))}
                    </span>
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                      row.status === "ACTIVE"
                        ? "bg-primary/5 text-primary/80"
                        : "bg-destructive/5 text-destructive/70"
                    )}
                  >
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </div>

      <div className="hidden sm:block bg-card rounded-xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table
            className="w-full text-left border-collapse min-w-[640px]"
            aria-label="Lista de movimientos"
          >
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Fecha
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-muted-foreground text-right"
                >
                  Monto
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Categoría
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(row)}
                  className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <td className="px-4 sm:px-6 py-4 text-muted-foreground font-medium text-sm whitespace-nowrap tabular-nums">
                    {formatDate(row.movement_date)}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
                        row.movement_type === "INCOME"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {MOVEMENT_TYPE_LABEL[row.movement_type] ?? row.movement_type}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right font-bold text-foreground tabular-nums text-sm">
                    {formatCLP(Number(row.amount))}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      {row.category_name}
                      {row.subcategory_name ? ` › ${row.subcategory_name}` : ""}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
                        row.status === "ACTIVE"
                          ? "bg-primary/5 text-primary/80"
                          : "bg-destructive/5 text-destructive/70"
                      )}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5}>
                    <Empty className="border-0 py-16">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileSearch />
                        </EmptyMedia>
                        <EmptyTitle>Sin resultados</EmptyTitle>
                        <EmptyDescription>
                          No hay registros para los filtros seleccionados.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    #{selected.folio_display}
                  </DialogTitle>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
                      selected.movement_type === "INCOME"
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {MOVEMENT_TYPE_LABEL[selected.movement_type] ?? selected.movement_type}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
                      selected.status === "ACTIVE"
                        ? "bg-primary/5 text-primary/80"
                        : "bg-destructive/5 text-destructive/70"
                    )}
                  >
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </div>
                <DialogDescription className="sr-only">
                  Detalle del movimiento {selected.folio_display}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg bg-muted px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Monto
                </p>
                <p className="font-heading text-2xl sm:text-3xl font-black tabular-nums text-primary">
                  {formatCLP(Number(selected.amount))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Fecha" value={formatDate(selected.movement_date)} />
                <Field
                  label="Categoría"
                  value={
                    selected.subcategory_name
                      ? `${selected.category_name} › ${selected.subcategory_name}`
                      : selected.category_name
                  }
                />
                <Field label="Responsable" value={selected.created_by.full_name} />
                <Field
                  label={selected.movement_type === "INCOME" ? "Entregado por" : "Entregado a"}
                  value={selected.delivered_by}
                />
                <Field label="Medio de pago" value={selected.payment_method_name} />
                <Field label="Correo de comprobante" value={selected.receipt_email} />
              </div>

              {selected.notes && (
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Observaciones
                  </p>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {selected.notes}
                  </p>
                </div>
              )}

              {selected.status === "CANCELLED" && selected.cancellation_reason && (
                <div className="rounded-lg bg-destructive/5 px-5 py-4 flex flex-col gap-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-destructive">
                    Motivo de Anulación
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {selected.cancellation_reason}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="h-10 px-5"
                  render={<Link href={`/movements/${selected.id}`} />}
                  nativeButton={false}
                >
                  Ver detalles
                </Button>
                {canWrite && selected.status !== "CANCELLED" && (
                  <CancelButton
                    movement={selected}
                    onSuccess={() => setSelected(null)}
                    className="h-10 px-5 bg-destructive/10 hover:bg-destructive/20 text-destructive border-none shadow-none"
                  />
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
