"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ArrowLeft, UserPlus, UserMinus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import { updateMinistrySchema, assignMinisterSchema } from "@/lib/validators/ministry"
import type { UpdateMinistryInput, AssignMinisterInput } from "@/lib/validators/ministry"
import { assignMinister, unassignMinister, updateMinistry } from "@/app/actions/ministries"

type Ministry = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
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

type Props = {
  ministry: Ministry
  users: MinistryUser[]
  assignments: Assignment[]
  currentAssignment: Assignment | null
}

export function MinistryDetailClient({
  ministry: initialMinistry,
  users,
  assignments: initialAssignments,
  currentAssignment: initialCurrent
}: Props) {
  const [ministry, setMinistry] = useState<Ministry>(initialMinistry)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [current, setCurrent] = useState<Assignment | null>(initialCurrent)
  const [editOpen, setEditOpen] = useState(false)

  const ministers = users.filter((u) => u.role === "MINISTER")
  const availableMinsters = ministers.filter((u) => u.id !== current?.user_id)

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
      toast.success("Ministro asignado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al asignar")
    }
  }

  async function handleUnassign() {
    try {
      await unassignMinister(ministry.id)
      if (current) {
        const closed = { ...current, unassigned_at: new Date().toISOString() }
        setAssignments((prev) => prev.map((a) => (a.id === current.id ? closed : a)))
      }
      setCurrent(null)
      toast.success("Ministro desasignado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al desasignar")
    }
  }

  async function handleEdit(values: UpdateMinistryInput) {
    try {
      const updated = await updateMinistry(ministry.id, {
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        is_active: values.is_active
      })
      setMinistry(updated as unknown as Ministry)
      setEditOpen(false)
      toast.success("Ministerio actualizado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar")
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4"
          render={<Link href="/ministries" />}
        >
          <ArrowLeft className="size-4" />
          Ministerios
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{ministry.name}</h1>
              {!ministry.is_active && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Inactivo
                </span>
              )}
            </div>
            {ministry.description && (
              <p className="text-sm text-muted-foreground">{ministry.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Creado el {formatDate(ministry.created_at)}
            </p>
          </div>

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
        </div>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-base font-medium">Ministro actual</h2>

        {current?.users ? (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{current.users.full_name}</p>
              <p className="text-xs text-muted-foreground">{current.users.email}</p>
              <p className="text-xs text-muted-foreground">
                Asignado el {formatDate(current.assigned_at)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnassign}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserMinus className="size-4" />
              Desasignar
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-3">
            Sin ministro asignado
          </p>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {current ? "Cambiar ministro" : "Asignar ministro"}
          </p>

          {availableMinsters.length === 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              <span>No hay ministros disponibles para asignar</span>
              <Button size="sm" variant="ghost" render={<Link href="/users" />}>
                <UserPlus className="size-4" />
                Crear ministro
              </Button>
            </div>
          ) : (
            <form onSubmit={assignForm.handleSubmit(handleAssign)} className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <NativeSelect
                    className="w-full"
                    {...assignForm.register("user_id")}
                    defaultValue=""
                  >
                    <NativeSelectOption value="" disabled>
                      Seleccionar ministro…
                    </NativeSelectOption>
                    {availableMinsters.map((u) => (
                      <NativeSelectOption key={u.id} value={u.id}>
                        {u.full_name} — {u.email}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[assignForm.formState.errors.user_id]} />
                </div>
                <Button size="sm" type="submit" disabled={assignForm.formState.isSubmitting}>
                  <UserPlus className="size-4" />
                  Asignar
                </Button>
              </div>
              <Input
                placeholder="Notas opcionales"
                className="text-sm"
                {...assignForm.register("notes")}
              />
            </form>
          )}
        </div>
      </section>

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
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                          <span className="size-1.5 rounded-full bg-green-500 inline-block" />
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
    </div>
  )
}
