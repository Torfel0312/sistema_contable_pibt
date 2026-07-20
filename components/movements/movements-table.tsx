"use client"

import { useState } from "react"
import Link from "next/link"
import { cn, formatDate, formatCLP } from "@/lib/utils"
import { CancelButton } from "./cancel-button"
import { Badge } from "@/components/ui/badge"
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
import { FileSearch, ArrowDownCircle, ArrowUpCircle } from "lucide-react"

function MovementTypeBadge({ type }: { type: string }) {
  const isIncome = type === "INCOME"
  const Icon = isIncome ? ArrowDownCircle : ArrowUpCircle
  return (
    <Badge variant={isIncome ? "income" : "expense"} className="uppercase tracking-wide">
      <Icon className="size-3" />
      {MOVEMENT_TYPE_LABEL[type] ?? type}
    </Badge>
  )
}

function MovementStatus({ status }: { status: string }) {
  const isActive = status === "ACTIVE"
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
      <span className={cn("size-[7px] shrink-0 rounded-full", isActive ? "bg-primary" : "bg-expense")} />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export type SerializedMovement = {
  id: string
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
  cancelled_by?: { full_name: string } | null
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
  canWrite,
  variant = "compact",
  title,
  viewAllHref
}: {
  rows: SerializedMovement[]
  canWrite: boolean
  variant?: "full" | "compact"
  title?: string
  viewAllHref?: string
}) {
  const [selected, setSelected] = useState<SerializedMovement | null>(null)
  const isFull = variant === "full"

  return (
    <>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card rounded-t-[14px] border-x border-t">
          <h2 className="font-heading text-[15px] font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[12.5px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Ver todos →
            </Link>
          )}
        </div>
      )}
      <div
        className={cn(
          "sm:hidden",
          title && "bg-card border-x border-b border-border rounded-b-[14px] overflow-hidden"
        )}
      >
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
                    <MovementTypeBadge type={row.movement_type} />
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
                  <MovementStatus status={row.status} />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </div>

      <div
        className={cn(
          "hidden sm:block overflow-x-auto bg-card",
          title
            ? "border-x border-b border-border rounded-b-[14px]"
            : "rounded-[14px] border border-border",
          !rows.length && "overflow-hidden"
        )}
        role="table"
        aria-label="Lista de movimientos"
      >
        <div
          role="row"
          className={cn(
            "grid gap-x-3.5 border-b border-border",
            isFull
              ? "grid-cols-[96px_110px_100px_1fr_130px_100px] px-6 py-3.5 min-w-[860px]"
              : "grid-cols-[84px_108px_84px_1fr_84px] px-5 py-4 min-w-[640px]"
          )}
        >
          <span role="columnheader" className="font-extrabold text-[10.5px] uppercase tracking-[0.06em] text-faint">
            Fecha
          </span>
          <span role="columnheader" className="font-extrabold text-[10.5px] uppercase tracking-[0.06em] text-faint">
            Tipo
          </span>
          <span role="columnheader" className="font-extrabold text-[10.5px] uppercase tracking-[0.06em] text-faint">
            Monto
          </span>
          <span role="columnheader" className="font-extrabold text-[10.5px] uppercase tracking-[0.06em] text-faint">
            Categoría
          </span>
          {isFull && (
            <span role="columnheader" className="font-extrabold text-[10.5px] uppercase tracking-[0.06em] text-faint">
              Registrado por
            </span>
          )}
          <span role="columnheader" className="font-extrabold text-[10.5px] uppercase tracking-[0.06em] text-faint">
            Estado
          </span>
        </div>
        <div role="rowgroup">
          {rows.map((row) => (
            <div
              key={row.id}
              role="row"
              tabIndex={0}
              onClick={() => setSelected(row)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(row)}
              className={cn(
                "grid gap-x-3.5 items-center border-t border-border cursor-pointer transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isFull
                  ? "grid-cols-[96px_110px_100px_1fr_130px_100px] px-6 py-[15px] text-[13.5px] min-w-[860px]"
                  : "grid-cols-[84px_108px_84px_1fr_84px] px-5 py-4 text-[13px] min-w-[640px]"
              )}
            >
              <span role="cell" className="text-muted-foreground whitespace-nowrap tabular-nums">
                {formatDate(row.movement_date)}
              </span>
              <span role="cell">
                <MovementTypeBadge type={row.movement_type} />
              </span>
              <span role="cell" className="font-bold text-foreground tabular-nums">
                {formatCLP(Number(row.amount))}
              </span>
              <span role="cell" className="text-muted-foreground">
                {row.category_name}
                {row.subcategory_name ? ` › ${row.subcategory_name}` : ""}
              </span>
              {isFull && (
                <span role="cell" className="text-muted-foreground">
                  {row.created_by.full_name}
                  {row.status === "CANCELLED" && row.cancelled_by && (
                    <span className="block text-[11px] font-bold text-expense">
                      Anuló: {row.cancelled_by.full_name}
                    </span>
                  )}
                </span>
              )}
              <span role="cell">
                <MovementStatus status={row.status} />
              </span>
            </div>
          ))}
        </div>
        {!rows.length && (
          <Empty className="border-0 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearch />
              </EmptyMedia>
              <EmptyTitle>Sin resultados</EmptyTitle>
              <EmptyDescription>No hay registros para los filtros seleccionados.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
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
                    Detalle del movimiento
                  </DialogTitle>
                  <MovementTypeBadge type={selected.movement_type} />
                  <MovementStatus status={selected.status} />
                </div>
                <DialogDescription className="sr-only">
                  Información completa del movimiento seleccionado
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
