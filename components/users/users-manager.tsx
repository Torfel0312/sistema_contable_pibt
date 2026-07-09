"use client"

import { useState, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/auth"
import { Card } from "@/components/ui/card"
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
import { NativeSelect } from "@/components/ui/native-select"
import { Plus, Users, Search, RotateCcw, Trash2, Send, Copy, Check, Link } from "lucide-react"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions
} from "@/components/ui/item"
import { createUserSchema, updateUserSchema } from "@/lib/validators/user"
import type { CreateUserInput, UpdateUserInput } from "@/lib/validators/user"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { toast } from "sonner"
import { inviteUser, updateUser, deleteUser, resendInvite, resetUser } from "@/app/actions/users"

type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING_ACTIVATION" | "PENDING_RESET"

type UserRow = {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string | Date
  updated_at: string | Date | null
}

function isLinkExpired(user: UserRow): boolean {
  if (user.status !== "PENDING_ACTIVATION" && user.status !== "PENDING_RESET") return false
  const expiryMs = user.status === "PENDING_ACTIVATION" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
  const lastAction = Math.max(
    new Date(user.created_at).getTime(),
    user.updated_at ? new Date(user.updated_at).getTime() : 0
  )
  return Date.now() - lastAction > expiryMs
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function roleBadgeClass(role: UserRole) {
  if (role === "ADMIN") return "bg-primary/10 text-primary"
  if (role === "BURSAR") return "bg-role-purple-surface text-role-purple"
  if (role === "FINANCE") return "bg-emerald-100 text-emerald-700"
  if (role === "MINISTER") return "bg-amber-100 text-amber-700"
  return "bg-muted text-muted-foreground"
}

function roleLabel(role: UserRole) {
  if (role === "ADMIN") return "Administrador"
  if (role === "BURSAR") return "Tesorero"
  if (role === "FINANCE") return "Finanzas"
  if (role === "MINISTER") return "Ministro"
  return role
}

type StatusMeta = {
  label: string
  badgeClass: string | null
  rowOpacity: boolean
}

function statusMeta(status: UserStatus): StatusMeta {
  switch (status) {
    case "ACTIVE":
      return { label: "Activo", badgeClass: null, rowOpacity: false }
    case "INACTIVE":
      return {
        label: "Inactivo",
        badgeClass: "bg-muted text-muted-foreground border border-border",
        rowOpacity: true
      }
    case "PENDING_ACTIVATION":
      return {
        label: "Sin activar",
        badgeClass:
          "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
        rowOpacity: false
      }
    case "PENDING_RESET":
      return {
        label: "Reset pendiente",
        badgeClass:
          "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
        rowOpacity: false
      }
  }
}

export function UsersManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [search, setSearch] = useState("")
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  function copyInviteLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { full_name: "", email: "", role: "BURSAR" }
  })

  const selectedRole = useWatch({ control: createForm.control, name: "role" })

  const handleCreate = (values: CreateUserInput) => {
    const promise = inviteUser(values)

    toast.promise(promise, {
      loading: "Enviando invitación...",
      success: (created) => {
        setUsers((prev) => [...prev, created as unknown as UserRow])
        createForm.reset()
        setCreateOpen(false)
        if (created.invite_link) {
          setLinkCopied(false)
          setInviteLink(created.invite_link)
        }
        return `Invitación enviada a ${created.email}`
      },
      error: (e: Error) => e.message
    })
  }

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema)
  })

  function openEdit(user: UserRow) {
    setEditingUser(user)
    editForm.reset({
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      status: user.status
    })
  }

  const handleUpdate = (values: UpdateUserInput) => {
    const promise = updateUser(values)

    toast.promise(promise, {
      loading: "Guardando cambios...",
      success: (updated) => {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
        setEditingUser(null)
        return "Usuario actualizado"
      },
      error: (e: Error) => e.message
    })
  }

  const handleDelete = () => {
    if (!deletingUser) return
    const { id: userId, full_name: name } = deletingUser
    setDeletingUser(null)

    toast.promise(deleteUser(userId), {
      loading: "Eliminando usuario...",
      success: () => {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        return `${name} fue eliminado`
      },
      error: (e: Error) => e.message
    })
  }

  const handleResendInvite = (userId: string) => {
    toast.promise(resendInvite(userId), {
      loading: "Reenviando invitación...",
      success: (data) => {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, updated_at: new Date().toISOString() } : u))
        )
        if (data?.invite_link) {
          setLinkCopied(false)
          setInviteLink(data.invite_link)
        }
        return "Invitación reenviada correctamente"
      },
      error: (e: Error) => e.message
    })
  }

  const handleReset = (userId: string) => {
    toast.promise(resetUser(userId), {
      loading: "Enviando correo de restablecimiento...",
      success: () => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  status: "PENDING_RESET" as UserStatus,
                  updated_at: new Date().toISOString()
                }
              : u
          )
        )
        return "Correo de restablecimiento enviado"
      },
      error: (e: Error) => e.message
    })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Search + invite */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-muted border-none rounded-xl text-sm"
          />
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button className="h-11 px-5 shrink-0">
                <Plus data-icon="inline-start" />
                Invitar
              </Button>
            }
          />
          <DialogContent className="w-[95vw] sm:max-w-xl bg-card p-0 overflow-y-auto max-h-[90vh]">
            <div className="p-6 sm:p-10 flex flex-col gap-8">
              <DialogHeader>
                <DialogTitle className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  Invitar Usuario
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-base mt-2">
                  Se enviará un correo de activación. El usuario establecerá su propia contraseña.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={createForm.handleSubmit(handleCreate)}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                    Datos del Colaborador
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <FieldGroup>
                  <Field data-invalid={!!createForm.formState.errors.full_name || undefined}>
                    <FieldLabel
                      htmlFor="new-full_name"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Nombre Completo
                    </FieldLabel>
                    <Input
                      id="new-full_name"
                      placeholder="Ej: Juan Pérez"
                      aria-invalid={!!createForm.formState.errors.full_name}
                      className="h-12 bg-muted border-none shadow-none rounded-xl px-5 text-base font-medium"
                      {...createForm.register("full_name")}
                    />
                    <FieldError errors={[createForm.formState.errors.full_name]} />
                  </Field>

                  <Field data-invalid={!!createForm.formState.errors.email || undefined}>
                    <FieldLabel
                      htmlFor="new-email"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Correo Electrónico
                    </FieldLabel>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      aria-invalid={!!createForm.formState.errors.email}
                      className="h-12 bg-muted border-none shadow-none rounded-xl px-5 text-base font-medium"
                      {...createForm.register("email")}
                    />
                    <FieldError errors={[createForm.formState.errors.email]} />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="new-role"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Nivel de Acceso
                    </FieldLabel>
                    <NativeSelect id="new-role" className="w-full" {...createForm.register("role")}>
                      <option value="ADMIN">Administrador — Control del Sistema</option>
                      <option value="BURSAR">Tesorero — Ingreso y Aprobación</option>
                      <option value="FINANCE">Finanzas — Monitoreo de Registros</option>
                      <option value="MINISTER">Ministro — Solicitudes de Fondos</option>
                    </NativeSelect>
                  </Field>
                </FieldGroup>

                {selectedRole === "ADMIN" && (
                  <Alert variant="warning">
                    <AlertTitle>Acceso total al sistema</AlertTitle>
                    <AlertDescription>
                      Puede invitar y eliminar usuarios, ver todos los movimientos, crear y anular
                      registros contables, y acceder a los reportes. Asigna este rol solo a personas
                      de plena confianza.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedRole === "BURSAR" && (
                  <Alert variant="info">
                    <AlertTitle>Tesorero — Ingreso y aprobación</AlertTitle>
                    <AlertDescription>
                      Puede crear, editar y anular movimientos contables, aprobar o rechazar
                      solicitudes de fondos de ministros y gestionar presupuestos. No puede
                      gestionar usuarios ni configurar el sistema.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedRole === "FINANCE" && (
                  <Alert variant="info">
                    <AlertTitle>Finanzas — Monitoreo de registros</AlertTitle>
                    <AlertDescription>
                      Puede consultar movimientos, presupuestos y el flujo de solicitudes, pero no
                      puede crear, editar ni aprobar ningún registro. Rol de supervisión financiera.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedRole === "MINISTER" && (
                  <Alert variant="info">
                    <AlertTitle>Solicitudes de fondos</AlertTitle>
                    <AlertDescription>
                      Puede enviar solicitudes de fondos para su ministerio y rendir los gastos
                      correspondientes. No tiene acceso a movimientos contables ni configuración.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={createForm.formState.isSubmitting}
                    className="h-11 text-sm"
                  >
                    {createForm.formState.isSubmitting
                      ? "Enviando invitación..."
                      : "Enviar Invitación"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="h-11"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground -mt-4">
        {filtered.length} integrante{filtered.length !== 1 ? "s" : ""}
        {search && ` — filtrando por "${search}"`}
      </p>

      {/* Edit dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(o) => {
          if (!o) setEditingUser(null)
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg bg-card p-0">
          <div className="p-6 sm:p-10 flex flex-col gap-8">
            <DialogHeader>
              <DialogTitle className="font-heading text-3xl font-bold tracking-tight text-foreground">
                Editar Usuario
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base mt-1">
                {editingUser?.email}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="flex flex-col gap-5">
              <FieldGroup>
                <Field data-invalid={!!editForm.formState.errors.full_name || undefined}>
                  <FieldLabel
                    htmlFor="edit-full_name"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Nombre Completo
                  </FieldLabel>
                  <Input
                    id="edit-full_name"
                    aria-invalid={!!editForm.formState.errors.full_name}
                    className="h-12 bg-muted border-none rounded-xl px-5 text-base font-medium"
                    {...editForm.register("full_name")}
                  />
                  <FieldError errors={[editForm.formState.errors.full_name]} />
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="edit-role"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Nivel de Acceso
                  </FieldLabel>
                  <NativeSelect id="edit-role" className="w-full" {...editForm.register("role")}>
                    <option value="ADMIN">Administrador — Control del Sistema</option>
                    <option value="BURSAR">Tesorero — Ingreso y Aprobación</option>
                    <option value="FINANCE">Finanzas — Monitoreo de Registros</option>
                    <option value="MINISTER">Ministro — Solicitudes de Fondos</option>
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="edit-status"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Estado de Cuenta
                  </FieldLabel>
                  <NativeSelect
                    id="edit-status"
                    className="w-full"
                    {...editForm.register("status")}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </NativeSelect>
                </Field>
              </FieldGroup>

              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button type="submit" disabled={editForm.formState.isSubmitting} className="h-11">
                  {editForm.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-11"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deletingUser}
        onOpenChange={(o) => {
          if (!o) setDeletingUser(null)
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-sm bg-card p-0">
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold text-foreground">
                Eliminar usuario
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                ¿Eliminar a <strong>{deletingUser?.full_name}</strong> ({deletingUser?.email})? Esta
                acción no se puede deshacer. Se cancelará cualquier invitación pendiente.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="destructive" className="h-10" onClick={() => void handleDelete()}>
                Sí, eliminar
              </Button>
              <Button variant="outline" className="h-10" onClick={() => setDeletingUser(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite link dialog */}
      <Dialog
        open={!!inviteLink}
        onOpenChange={(o) => {
          if (!o) setInviteLink(null)
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg bg-card p-0">
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                <Link className="size-5 text-primary shrink-0" />
                Enlace de invitación
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                Comparte este enlace con el usuario para que active su cuenta. Expira en{" "}
                <strong>24 horas</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={inviteLink ?? ""}
                className="h-11 bg-muted border-none rounded-xl px-4 text-sm font-mono truncate"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="sm"
                variant={linkCopied ? "outline" : "default"}
                onClick={copyInviteLink}
                className="h-11 px-4 shrink-0 gap-1.5"
              >
                {linkCopied ? (
                  <>
                    <Check className="size-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <div className="pt-2 border-t border-border">
              <Button variant="outline" className="h-10 w-full" onClick={() => setInviteLink(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User list */}
      {users.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <Empty className="border-0 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>Sin usuarios</EmptyTitle>
              <EmptyDescription>
                No hay usuarios registrados en el equipo ministerial.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : filtered.length === 0 ? (
        <Empty className="border-dashed py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>No hay usuarios que coincidan con la búsqueda.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup>
          {filtered.map((user) => {
            const meta = statusMeta(user.status)
            const isActive = user.status === "ACTIVE"
            const linkExpired = isLinkExpired(user)
            return (
              <Item key={user.id} variant="outline" className={cn(meta.rowOpacity && "opacity-55")}>
                <div
                  className={cn(
                    "size-10 rounded-full flex items-center justify-center shrink-0",
                    isActive ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {getInitials(user.full_name || "?")}
                  </span>
                </div>
                <ItemContent>
                  <ItemTitle>{user.full_name}</ItemTitle>
                  <ItemDescription>{user.email}</ItemDescription>
                  <div className="sm:hidden mt-0.5 flex flex-wrap gap-1">
                    {meta.badgeClass && (
                      <span
                        className={cn(
                          "w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          meta.badgeClass
                        )}
                      >
                        {meta.label}
                      </span>
                    )}
                    {linkExpired && (
                      <span className="w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-destructive/10 text-destructive border border-destructive/20">
                        Enlace expirado
                      </span>
                    )}
                  </div>
                </ItemContent>
                <ItemActions>
                  <span
                    className={cn(
                      "hidden sm:inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
                      roleBadgeClass(user.role)
                    )}
                  >
                    {roleLabel(user.role)}
                  </span>
                  {meta.badgeClass && (
                    <span
                      className={cn(
                        "hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                  )}
                  {linkExpired && (
                    <span className="hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-destructive/10 text-destructive border border-destructive/20">
                      Enlace expirado
                    </span>
                  )}
                  {user.status === "PENDING_ACTIVATION" && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => void handleResendInvite(user.id)}
                      title="Reenviar invitación"
                      className="rounded-full px-2"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => void handleReset(user.id)}
                    title="Resetear contraseña"
                    className="rounded-full px-2"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setDeletingUser(user)}
                    title="Eliminar usuario"
                    className="rounded-full px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => openEdit(user)}
                    className="rounded-full px-4"
                  >
                    Editar
                  </Button>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      )}
    </div>
  )
}
