"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { X, Plus, Mail, Pencil, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Item, ItemGroup, ItemContent, ItemTitle } from "@/components/ui/item"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { createInboundEmailRouteSchema } from "@/lib/validators/inbound-email-route"
import type { CreateInboundEmailRouteInput } from "@/lib/validators/inbound-email-route"
import type { InboundEmailRoute } from "@/services/email/inbound-routes.service"
import {
  createInboundEmailRoute,
  removeInboundEmailRoute,
  renameInboundMailboxGroup,
  removeInboundMailboxGroup
} from "@/app/actions/inbound-email-routes"

const DOMAIN = "pibtalcahuano.com"

type SimpleUser = { id: string; full_name: string; email: string }

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function InboundEmailRoutesSection({
  initialRoutes,
  users
}: {
  initialRoutes: InboundEmailRoute[]
  users: SimpleUser[]
}) {
  const [routes, setRoutes] = useState<InboundEmailRoute[]>(initialRoutes)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null)
  const [inlineUser, setInlineUser] = useState<Record<string, string>>({})
  const [createOpen, setCreateOpen] = useState(false)

  const form = useForm<CreateInboundEmailRouteInput>({
    resolver: zodResolver(createInboundEmailRouteSchema),
    defaultValues: { local_part: "", user_id: "" }
  })

  const groups = new Map<string, InboundEmailRoute[]>()
  for (const route of routes) {
    const existing = groups.get(route.local_part) ?? []
    groups.set(route.local_part, [...existing, route])
  }
  const localParts = [...groups.keys()].sort()

  function usersAvailableFor(localPart: string) {
    const assigned = new Set((groups.get(localPart) ?? []).map((r) => r.user_id))
    return users.filter((u) => !assigned.has(u.id))
  }

  async function addRoute(values: CreateInboundEmailRouteInput) {
    const created = await createInboundEmailRoute(values)
    const assignedUser = users.find((u) => u.id === values.user_id)
    setRoutes((prev) => [
      ...prev,
      {
        id: created.id,
        local_part: created.local_part,
        user_id: created.user_id,
        users: assignedUser
          ? { full_name: assignedUser.full_name, email: assignedUser.email }
          : null
      }
    ])
  }

  async function handleAdd(values: CreateInboundEmailRouteInput) {
    try {
      await addRoute(values)
      form.reset({ local_part: "", user_id: "" })
      setCreateOpen(false)
      toast.success("Grupo creado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear grupo")
    }
  }

  async function handleInlineAdd(localPart: string) {
    const userId = inlineUser[localPart]
    if (!userId) return
    try {
      await addRoute({ local_part: localPart, user_id: userId })
      setInlineUser((prev) => ({ ...prev, [localPart]: "" }))
      toast.success("Destinatario agregado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar destinatario")
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeInboundEmailRoute(id)
      setRoutes((prev) => prev.filter((r) => r.id !== id))
      toast.success("Destinatario eliminado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar destinatario")
    }
  }

  function startRename(localPart: string) {
    setEditingGroup(localPart)
    setRenameValue(localPart)
  }

  async function confirmRename() {
    if (!editingGroup) return
    const newLocalPart = renameValue.trim().toLowerCase()
    if (!newLocalPart || newLocalPart === editingGroup) {
      setEditingGroup(null)
      return
    }
    try {
      await renameInboundMailboxGroup({
        old_local_part: editingGroup,
        new_local_part: newLocalPart
      })
      setRoutes((prev) =>
        prev.map((r) => (r.local_part === editingGroup ? { ...r, local_part: newLocalPart } : r))
      )
      toast.success("Grupo renombrado")
      setEditingGroup(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar grupo")
    }
  }

  async function confirmDelete() {
    if (!deletingGroup) return
    const localPart = deletingGroup
    setDeletingGroup(null)
    try {
      await removeInboundMailboxGroup(localPart)
      setRoutes((prev) => prev.filter((r) => r.local_part !== localPart))
      toast.success("Grupo eliminado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar grupo")
    }
  }

  const selectedLocalPart = useWatch({ control: form.control, name: "local_part" })
  const alreadyAssignedIds = new Set(
    (groups.get(selectedLocalPart.toLowerCase()) ?? []).map((r) => r.user_id)
  )
  const availableUsers = users.filter((u) => !alreadyAssignedIds.has(u.id))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Correo entrante
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reglas de reenvío de correos entrantes a usuarios internos.
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o)
            if (!o) form.reset({ local_part: "", user_id: "" })
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm" className="shrink-0">
                <Plus className="size-4" />
                Nuevo grupo
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo grupo</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleAdd)} className="flex flex-col gap-4 pt-2">
              <Field>
                <FieldLabel htmlFor="local-part">Nombre del grupo</FieldLabel>
                <Input id="local-part" placeholder="tesoreria" {...form.register("local_part")} />
                <FieldError errors={[form.formState.errors.local_part]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="route-user">Usuario</FieldLabel>
                <NativeSelect id="route-user" {...form.register("user_id")} defaultValue="">
                  <NativeSelectOption value="">Seleccionar usuario…</NativeSelectOption>
                  {availableUsers.map((u) => (
                    <NativeSelectOption key={u.id} value={u.id}>
                      {u.full_name} — {u.email}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[form.formState.errors.user_id]} />
              </Field>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creando..." : "Crear grupo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="-mt-4 text-xs text-muted-foreground">
        Correos externos enviados a un grupo @{DOMAIN} se reenvían automáticamente a los usuarios
        asignados.
      </p>

      {localParts.length === 0 ? (
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Mail />
            </EmptyMedia>
            <EmptyTitle>Sin grupos configurados</EmptyTitle>
            <EmptyDescription>Crea uno con el botón &ldquo;Nuevo grupo&rdquo;.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup>
          {localParts.map((localPart) => {
            const isEditing = editingGroup === localPart
            const usersAvailable = usersAvailableFor(localPart)
            return (
              <Item key={localPart} variant="outline" className="flex-col items-stretch">
                <div className="flex w-full items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="size-4 text-primary" />
                  </div>
                  <ItemContent>
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void confirmRename()
                            if (e.key === "Escape") setEditingGroup(null)
                          }}
                          className="h-8 max-w-[10rem]"
                        />
                        <span className="text-sm text-muted-foreground">@{DOMAIN}</span>
                        <Button size="xs" variant="ghost" onClick={() => void confirmRename()}>
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setEditingGroup(null)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <ItemTitle>
                        {localPart}@{DOMAIN}
                      </ItemTitle>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {groups.get(localPart)!.length}{" "}
                      {groups.get(localPart)!.length === 1 ? "destinatario" : "destinatarios"}
                    </p>
                  </ItemContent>
                  {!isEditing && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => startRename(localPart)}
                        title="Renombrar grupo"
                        className="rounded-full px-2"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setDeletingGroup(localPart)}
                        title="Eliminar grupo"
                        className="rounded-full px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border">
                  {groups.get(localPart)!.map((route) => (
                    <div key={route.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {getInitials(route.users?.full_name ?? "?")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {route.users?.full_name ?? route.user_id}
                        </p>
                        {route.users?.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {route.users.email}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(route.id)}
                        aria-label="Quitar destinatario"
                        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {usersAvailable.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <NativeSelect
                      value={inlineUser[localPart] ?? ""}
                      onChange={(e) =>
                        setInlineUser((prev) => ({ ...prev, [localPart]: e.target.value }))
                      }
                      className="h-8 flex-1 text-xs"
                    >
                      <NativeSelectOption value="" disabled>
                        Agregar usuario a este grupo…
                      </NativeSelectOption>
                      {usersAvailable.map((u) => (
                        <NativeSelectOption key={u.id} value={u.id}>
                          {u.full_name} — {u.email}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={!inlineUser[localPart]}
                      onClick={() => void handleInlineAdd(localPart)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                )}
              </Item>
            )
          })}
        </ItemGroup>
      )}

      <Dialog
        open={!!deletingGroup}
        onOpenChange={(o) => {
          if (!o) setDeletingGroup(null)
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-sm bg-card p-0">
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold text-foreground">
                Eliminar grupo
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                ¿Eliminar{" "}
                <strong>
                  {deletingGroup}@{DOMAIN}
                </strong>
                ? Se quitarán todos sus destinatarios. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="destructive" className="h-10" onClick={() => void confirmDelete()}>
                Sí, eliminar
              </Button>
              <Button variant="outline" className="h-10" onClick={() => setDeletingGroup(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
