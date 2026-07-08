"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { X, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { createInboundEmailRouteSchema } from "@/lib/validators/inbound-email-route"
import type { CreateInboundEmailRouteInput } from "@/lib/validators/inbound-email-route"
import type { InboundEmailRoute } from "@/services/email/inbound-routes.service"
import {
  createInboundEmailRoute,
  removeInboundEmailRoute
} from "@/app/actions/inbound-email-routes"

type SimpleUser = { id: string; full_name: string; email: string }

export function InboundEmailRoutesSection({
  initialRoutes,
  users
}: {
  initialRoutes: InboundEmailRoute[]
  users: SimpleUser[]
}) {
  const [routes, setRoutes] = useState<InboundEmailRoute[]>(initialRoutes)

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

  async function handleAdd(values: CreateInboundEmailRouteInput) {
    try {
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
      form.reset({ local_part: values.local_part, user_id: "" })
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

  const selectedLocalPart = useWatch({ control: form.control, name: "local_part" })
  const alreadyAssignedIds = new Set(
    (groups.get(selectedLocalPart.toLowerCase()) ?? []).map((r) => r.user_id)
  )
  const availableUsers = users.filter((u) => !alreadyAssignedIds.has(u.id))

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reenvío de correos entrantes</h2>
        <p className="text-sm text-muted-foreground">
          Correos externos enviados a un buzón @pibtalcahuano.com se reenvían automáticamente a
          los usuarios asignados.
        </p>
      </div>

      <Card className="p-5 space-y-5">
        {localParts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin buzones configurados.</p>
        ) : (
          <div className="space-y-4">
            {localParts.map((localPart) => (
              <div key={localPart} className="space-y-2">
                <p className="text-sm font-medium">{localPart}@pibtalcahuano.com</p>
                <div className="flex flex-wrap gap-2">
                  {groups.get(localPart)!.map((route) => (
                    <span
                      key={route.id}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded"
                    >
                      {route.users?.full_name ?? route.user_id}
                      <button
                        type="button"
                        onClick={() => handleRemove(route.id)}
                        aria-label="Quitar destinatario"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Agregar destinatario</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Field>
                <FieldLabel htmlFor="local-part">Buzón</FieldLabel>
                <Input id="local-part" placeholder="tesoreria" {...form.register("local_part")} />
                <FieldError errors={[form.formState.errors.local_part]} />
              </Field>
            </div>
            <div className="flex-1">
              <Field>
                <FieldLabel htmlFor="route-user">Usuario</FieldLabel>
                <NativeSelect id="route-user" {...form.register("user_id")} defaultValue="">
                  <NativeSelectOption value="" disabled>
                    Seleccionar usuario…
                  </NativeSelectOption>
                  {availableUsers.map((u) => (
                    <NativeSelectOption key={u.id} value={u.id}>
                      {u.full_name} — {u.email}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[form.formState.errors.user_id]} />
              </Field>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </form>
      </Card>
    </div>
  )
}
