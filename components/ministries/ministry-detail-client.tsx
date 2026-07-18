"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  ClipboardList,
  Pencil,
  TrendingDown,
  UserPlus,
  UserMinus,
  UserRound
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { formatDate, formatCLP, avatarColorFor, initialsFor } from "@/lib/utils"
import { updateMinistrySchema, assignMinisterSchema } from "@/lib/validators/ministry"
import type { UpdateMinistryInput, AssignMinisterInput } from "@/lib/validators/ministry"
import { assignMinister, unassignMinister, updateMinistry } from "@/app/actions/ministries"
import type { MinistryLeftoverRow } from "@/services/ministries/ministry-leftover.service"
import type { intentionsService } from "@/services/intentions/intentions.service"
import type { ministriesService } from "@/services/ministries/ministries.service"

type Ministry = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  created_by_user?: { full_name: string } | null
}

type MinistryUser = {
  id: string
  full_name: string
  email: string
  role: string
}

type Assignment = {
  id: string
  user_id: string
  assigned_at: string
  unassigned_at: string | null
  users: { id: string; full_name: string; email: string } | null
}

type MinistryIntention = Awaited<ReturnType<typeof intentionsService.list>>[number]
type AssociatedMovement = Awaited<ReturnType<typeof ministriesService.getAssociatedMovements>>[number]

type Props = {
  ministry: Ministry
  users: MinistryUser[]
  assignments: Assignment[]
  currentAssignment: Assignment | null
  leftover: MinistryLeftoverRow[]
  intentions: MinistryIntention[]
  associatedMovements: AssociatedMovement[]
}

const INTENTION_STATUS_BADGE = {
  DRAFT: { variant: "neutral" as const, label: "Borrador" },
  PENDING: { variant: "warn" as const, label: "Pendiente" },
  APPROVED: { variant: "income" as const, label: "Aprobada" },
  REJECTED: { variant: "expense" as const, label: "Rechazada" },
  CANCELLED: { variant: "neutral" as const, label: "Cancelada" }
}

export function MinistryDetailClient({
  ministry: initialMinistry,
  users,
  assignments: initialAssignments,
  currentAssignment: initialCurrent,
  leftover,
  intentions,
  associatedMovements
}: Props) {
  const [ministry, setMinistry] = useState<Ministry>(initialMinistry)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [current, setCurrent] = useState<Assignment | null>(initialCurrent)
  const [editOpen, setEditOpen] = useState(false)
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false)
  const [unassigning, setUnassigning] = useState(false)
  const [changingMinister, setChangingMinister] = useState(false)

  const ministers = users.filter((u) => u.role === "MINISTER")
  const availableMinsters = ministers.filter((u) => u.id !== current?.user_id)

  const totalTransferred = leftover.reduce((sum, row) => sum + row.transferred_amount, 0)
  const totalSettled = leftover.reduce((sum, row) => sum + row.settled_amount, 0)
  const settledPct = totalTransferred > 0 ? Math.round((totalSettled / totalTransferred) * 100) : 0
  const pendingCount = intentions.filter((i) => i.status === "PENDING").length
  const approvedCount = intentions.filter((i) => i.status === "APPROVED").length
  const rejectedCount = intentions.filter((i) => i.status === "REJECTED").length

  const assignForm = useForm<AssignMinisterInput>({
    resolver: zodResolver(assignMinisterSchema),
    defaultValues: { user_id: "", notes: "" }
  })

  const editForm = useForm<UpdateMinistryInput>({
    resolver: zodResolver(updateMinistrySchema),
    defaultValues: {
      name: ministry.name,
      description: ministry.description ?? "",
      is_active: ministry.is_active
    }
  })

  async function handleAssign(values: AssignMinisterInput) {
    try {
      const result = await assignMinister(ministry.id, {
        user_id: values.user_id,
        notes: values.notes?.trim() || undefined
      })
      const assignedUser = users.find((u) => u.id === values.user_id)
      const newAssignment: Assignment = {
        id: (result as { id: string }).id,
        user_id: values.user_id,
        assigned_at: new Date().toISOString(),
        unassigned_at: null,
        users: assignedUser
          ? { id: assignedUser.id, full_name: assignedUser.full_name, email: assignedUser.email }
          : null
      }
      if (current) {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === current.id ? { ...a, unassigned_at: new Date().toISOString() } : a
          )
        )
      }
      setCurrent(newAssignment)
      setAssignments((prev) => [
        newAssignment,
        ...prev.filter((a) => a.id !== current?.id),
        ...(current ? [{ ...current, unassigned_at: new Date().toISOString() }] : [])
      ])
      assignForm.reset()
      setChangingMinister(false)
      toast.success("Ministro asignado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al asignar")
    }
  }

  async function handleUnassign() {
    setUnassigning(true)
    try {
      await unassignMinister(ministry.id)
      if (current) {
        const closed = { ...current, unassigned_at: new Date().toISOString() }
        setAssignments((prev) => prev.map((a) => (a.id === current.id ? closed : a)))
      }
      setCurrent(null)
      setUnassignConfirmOpen(false)
      toast.success("Ministro desasignado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al desasignar")
    } finally {
      setUnassigning(false)
    }
  }

  async function handleEdit(values: UpdateMinistryInput) {
    try {
      const updated = await updateMinistry(ministry.id, {
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        is_active: values.is_active
      })
      setMinistry((prev) => ({ ...prev, ...(updated as unknown as Ministry) }))
      setEditOpen(false)
      toast.success("Ministerio actualizado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar")
    }
  }

  const assignMinisterForm = (
    <form onSubmit={assignForm.handleSubmit(handleAssign)} className="flex flex-col gap-2">
      {availableMinsters.length === 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <span>No hay ministros disponibles</span>
          <Button
            size="sm"
            variant="ghost"
            render={<Link href="/users?invite=MINISTER" />}
            nativeButton={false}
          >
            <UserPlus className="size-4" />
            Crear ministro
          </Button>
        </div>
      ) : (
        <>
          <NativeSelect className="w-full" {...assignForm.register("user_id")} defaultValue="">
            <NativeSelectOption value="">Seleccionar ministro…</NativeSelectOption>
            {availableMinsters.map((u) => (
              <NativeSelectOption key={u.id} value={u.id}>
                {u.full_name} — {u.email}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[assignForm.formState.errors.user_id]} />
          <Input placeholder="Notas opcionales" {...assignForm.register("notes")} />
          <Button size="sm" type="submit" disabled={assignForm.formState.isSubmitting}>
            <UserPlus className="size-4" />
            Asignar
          </Button>
        </>
      )}
    </form>
  )

  return (
    <div className="max-w-6xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/ministries" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />
        Volver a ministerios
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white"
            style={{ background: avatarColorFor(ministry.name) }}
          >
            {initialsFor(ministry.name)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
                {ministry.name}
              </h1>
              <Badge variant={ministry.is_active ? "income" : "neutral"}>
                {ministry.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            {ministry.description && (
              <p className="text-sm text-muted-foreground">{ministry.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog
            open={editOpen}
            onOpenChange={(o) => {
              setEditOpen(o)
              if (!o)
                editForm.reset({
                  name: ministry.name,
                  description: ministry.description ?? "",
                  is_active: ministry.is_active
                })
            }}
          >
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" />
                  Editar
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar ministerio</DialogTitle>
              </DialogHeader>
              <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 pt-2">
                <Field>
                  <FieldLabel htmlFor="edit-name">Nombre *</FieldLabel>
                  <Input id="edit-name" {...editForm.register("name")} />
                  <FieldError errors={[editForm.formState.errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-description">Descripción</FieldLabel>
                  <Input id="edit-description" {...editForm.register("description")} />
                  <FieldError errors={[editForm.formState.errors.description]} />
                </Field>
                <Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...editForm.register("is_active")} className="size-4" />
                    Ministerio activo
                  </label>
                </Field>
                <Button type="submit" className="w-full" disabled={editForm.formState.isSubmitting}>
                  {editForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button size="sm" render={<Link href="/movements/new" />} nativeButton={false}>
            <ArrowLeftRight className="size-4" />
            Transferir fondos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Fondos transferidos
            </span>
            <div className="flex size-[26px] items-center justify-center rounded-lg bg-primary-soft">
              <ArrowLeftRight className="size-3.5 text-primary" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums">{formatCLP(totalTransferred)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total histórico · {leftover.length} transferencia{leftover.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Rendido
            </span>
            <div className="flex size-[26px] items-center justify-center rounded-lg bg-income-surface">
              <BadgeCheck className="size-3.5 text-income" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums">{formatCLP(totalSettled)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {settledPct}% de los fondos entregados
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Solicitudes
            </span>
            <div className="flex size-[26px] items-center justify-center rounded-lg bg-warn-surface">
              <ClipboardList className="size-3.5 text-on-warn" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums">{intentions.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingCount} pendiente{pendingCount === 1 ? "" : "s"} · {approvedCount} aprobada
              {approvedCount === 1 ? "" : "s"} · {rejectedCount} rechazada{rejectedCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground">Ministro asignado</h2>
            {current?.users ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                  style={{ background: avatarColorFor(current.users.full_name) }}
                >
                  {initialsFor(current.users.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{current.users.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{current.users.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="size-4" />
                Sin ministro asignado
              </div>
            )}

            {current && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setUnassignConfirmOpen(true)}
                className="w-fit"
              >
                <UserMinus className="size-4" />
                Desasignar
              </Button>
            )}

            {changingMinister || !current ? (
              assignMinisterForm
            ) : (
              <Button variant="outline" size="sm" onClick={() => setChangingMinister(true)}>
                Cambiar ministro
              </Button>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground">Información</h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Creado
                </p>
                <p className="text-sm font-semibold">{formatDate(ministry.created_at)}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Creado por
                </p>
                <p className="text-sm font-semibold">
                  {ministry.created_by_user?.full_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Última solicitud
                </p>
                <p className="text-sm font-semibold">
                  {intentions[0] ? formatDate(intentions[0].created_at) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Solicitudes del ministerio</h2>
              <Link href="/requests" className="text-xs font-bold text-primary hover:underline">
                Ver todas →
              </Link>
            </div>
            {intentions.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-4">Sin solicitudes registradas.</p>
            ) : (
              <div className="flex flex-col">
                {intentions.slice(0, 4).map((intention) => {
                  const badge = INTENTION_STATUS_BADGE[intention.status]
                  return (
                    <Link
                      key={intention.id}
                      href={`/requests/${intention.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 border-t border-border first:border-t-0 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <ClipboardList className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{intention.purpose}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Solicitada el {formatDate(intention.created_at)} por{" "}
                          {intention.users?.full_name ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-extrabold tabular-nums">
                          {formatCLP(intention.amount)}
                        </span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Movimientos asociados</h2>
            </div>
            {associatedMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-4">Sin movimientos asociados.</p>
            ) : (
              <div className="flex flex-col">
                {associatedMovements.map((movement) => (
                  <Link
                    key={movement.id}
                    href={`/movements/${movement.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 border-t border-border first:border-t-0 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-expense-surface">
                      <TrendingDown className="size-4 text-expense" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">
                        {movement.movement_categories?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(movement.movement_date)} · Registrado por{" "}
                        {movement.created_by?.full_name ?? "—"}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums text-expense shrink-0">
                      -{formatCLP(Number(movement.amount))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-base font-medium">Historial de asignaciones</h2>

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin asignaciones registradas.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Ministro</th>
                  <th className="px-4 py-2 text-left font-medium">Desde</th>
                  <th className="px-4 py-2 text-left font-medium">Hasta</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignments.map((a) => (
                  <tr key={a.id} className="bg-card">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.users?.full_name ?? a.user_id}</p>
                      {a.users?.email && (
                        <p className="text-xs text-muted-foreground">{a.users.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(a.assigned_at)}</td>
                    <td className="px-4 py-3">
                      {a.unassigned_at ? (
                        <span className="text-muted-foreground">{formatDate(a.unassigned_at)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-income">
                          <span className="size-1.5 rounded-full bg-income inline-block" />
                          Activo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">Remanente</h2>
          <p className="text-xs text-muted-foreground">
            Transferido menos rendido (aprobado), a la fecha
          </p>
        </div>

        {leftover.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin solicitudes con transferencia anticipada.
          </p>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Solicitud</th>
                    <th className="px-4 py-2 text-right font-medium">Transferido</th>
                    <th className="px-4 py-2 text-right font-medium">Rendido</th>
                    <th className="px-4 py-2 text-right font-medium">Remanente</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leftover.map((row) => (
                    <tr key={row.intention_id} className="bg-card">
                      <td className="px-4 py-3">{row.purpose}</td>
                      <td className="px-4 py-3 text-right">{formatCLP(row.transferred_amount)}</td>
                      <td className="px-4 py-3 text-right">{formatCLP(row.settled_amount)}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${row.leftover > 0 ? "text-warn" : row.leftover < 0 ? "text-destructive" : ""}`}
                      >
                        {formatCLP(row.leftover)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm font-medium text-right">
              Total: {formatCLP(leftover.reduce((sum, row) => sum + row.leftover, 0))}
            </p>
          </>
        )}
      </section>

      <Dialog open={unassignConfirmOpen} onOpenChange={(o) => !unassigning && setUnassignConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desasignar ministro</DialogTitle>
            <DialogDescription>
              ¿Desasignar a <strong>{current?.users?.full_name}</strong> de este ministerio?
            </DialogDescription>
          </DialogHeader>
          {unassigning && (
            <Marker role="status" aria-live="polite">
              <MarkerIcon>
                <Spinner />
              </MarkerIcon>
              <MarkerContent>Desasignando…</MarkerContent>
            </Marker>
          )}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Button variant="destructive" disabled={unassigning} onClick={() => void handleUnassign()}>
              Sí, desasignar
            </Button>
            <Button
              variant="outline"
              disabled={unassigning}
              onClick={() => setUnassignConfirmOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
