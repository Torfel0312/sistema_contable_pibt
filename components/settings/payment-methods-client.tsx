"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, CreditCard, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  createPaymentMethodSchema,
  type CreatePaymentMethodInput
} from "@/lib/validators/payment-method"
import { createPaymentMethod, updatePaymentMethod } from "@/app/actions/payment-methods"

type PaymentMethod = {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

type Props = {
  initialPaymentMethods: PaymentMethod[]
}

export function PaymentMethodsClient({ initialPaymentMethods }: Props) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [pendingActive, setPendingActive] = useState(true)

  const form = useForm<CreatePaymentMethodInput>({
    resolver: zodResolver(createPaymentMethodSchema),
    defaultValues: { name: "" }
  })

  const editForm = useForm<CreatePaymentMethodInput>({
    resolver: zodResolver(createPaymentMethodSchema),
    defaultValues: { name: "" }
  })

  async function handleCreate(values: CreatePaymentMethodInput) {
    try {
      const created = await createPaymentMethod({ name: values.name.trim() })
      setPaymentMethods((prev) => [...prev, created as unknown as PaymentMethod])
      form.reset()
      setOpen(false)
      toast.success("Medio de pago creado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear medio de pago")
    }
  }

  function openEdit(pm: PaymentMethod) {
    editForm.reset({ name: pm.name })
    setPendingActive(pm.is_active)
    setEditing(pm)
  }

  async function handleSaveEdit(values: CreatePaymentMethodInput) {
    if (!editing) return
    try {
      const name = values.name.trim()
      await updatePaymentMethod(editing.id, { name, is_active: pendingActive })
      setPaymentMethods((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...p, name, is_active: pendingActive } : p))
      )
      toast.success("Medio de pago actualizado")
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar medio de pago")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {paymentMethods.length} medio{paymentMethods.length === 1 ? "" : "s"} de pago registrado
          {paymentMethods.length === 1 ? "" : "s"}
        </p>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) form.reset()
          }}
        >
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" />
                Nuevo medio de pago
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo medio de pago</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4 pt-2">
              <Field>
                <FieldLabel htmlFor="name">Nombre *</FieldLabel>
                <Input
                  id="name"
                  placeholder="Efectivo, Transferencia..."
                  {...form.register("name")}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creando..." : "Crear medio de pago"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <CreditCard className="size-10 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Sin medios de pago</EmptyTitle>
            <EmptyDescription>Crea el primer medio de pago para comenzar.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {paymentMethods.map((pm) => (
            <Item
              key={pm.id}
              variant="outline"
              className="cursor-pointer"
              onClick={() => openEdit(pm)}
            >
              <ItemMedia className="flex size-[34px] items-center justify-center rounded-[10px] bg-primary/10">
                <CreditCard className="size-4 text-primary" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{pm.name}</ItemTitle>
              </ItemContent>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-bold",
                  pm.is_active ? "text-income" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    pm.is_active ? "bg-income" : "bg-muted-foreground"
                  )}
                />
                {pm.is_active ? "Activo" : "Archivado"}
              </span>
              <ItemActions>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(pm)
                  }}
                  aria-label={`Configurar ${pm.name}`}
                >
                  <Settings2 className="size-3.5" />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null)
            editForm.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar medio de pago</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Modifica el nombre o cambia el estado del medio de pago.
          </p>
          <form onSubmit={editForm.handleSubmit(handleSaveEdit)} className="space-y-4 pt-2">
            <Field>
              <FieldLabel htmlFor="edit-name">Nombre</FieldLabel>
              <Input id="edit-name" {...editForm.register("name")} />
              <FieldError errors={[editForm.formState.errors.name]} />
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-3.5 py-3">
              <div>
                <p className="text-sm font-bold">Estado</p>
                <p className="text-xs text-muted-foreground">
                  Los medios inactivos no aparecen al registrar movimientos.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "shrink-0 gap-1.5",
                  pendingActive ? "text-income border-income/40" : "text-muted-foreground"
                )}
                onClick={() => setPendingActive((v) => !v)}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    pendingActive ? "bg-income" : "bg-muted-foreground"
                  )}
                />
                {pendingActive ? "Activo" : "Archivado"}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={editForm.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
