"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, CreditCard, Archive, ArchiveRestore, Pencil } from "lucide-react"
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
import { Item, ItemGroup, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item"
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
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)

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
    setEditing(pm)
  }

  async function handleRename(values: CreatePaymentMethodInput) {
    if (!editing) return
    try {
      await updatePaymentMethod(editing.id, { name: values.name.trim() })
      setPaymentMethods((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...p, name: values.name.trim() } : p))
      )
      toast.success("Medio de pago actualizado")
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar medio de pago")
    }
  }

  async function handleToggle(pm: PaymentMethod) {
    setTogglingId(pm.id)
    try {
      await updatePaymentMethod(pm.id, { is_active: !pm.is_active })
      setPaymentMethods((prev) =>
        prev.map((p) => (p.id === pm.id ? { ...p, is_active: !p.is_active } : p))
      )
      toast.success(pm.is_active ? "Medio de pago archivado" : "Medio de pago reactivado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar medio de pago")
    } finally {
      setTogglingId(null)
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
        <ItemGroup>
          {paymentMethods.map((pm) => (
            <Item key={pm.id} variant="outline">
              <ItemContent>
                <div className="flex items-center gap-2">
                  <ItemTitle>{pm.name}</ItemTitle>
                  <span
                    className={
                      pm.is_active
                        ? "text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
                        : "text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                    }
                  >
                    {pm.is_active ? "Activo" : "Archivado"}
                  </span>
                </div>
              </ItemContent>
              <ItemActions className="gap-2">
                <Button variant="outline" onClick={() => openEdit(pm)} className="gap-1.5">
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  disabled={togglingId === pm.id}
                  onClick={() => handleToggle(pm)}
                  className="gap-1.5"
                >
                  {pm.is_active ? (
                    <>
                      <Archive className="size-3.5" />
                      Archivar
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="size-3.5" />
                      Reactivar
                    </>
                  )}
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
            <DialogTitle>Renombrar medio de pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleRename)} className="space-y-4 pt-2">
            <Field>
              <FieldLabel htmlFor="edit-name">Nombre *</FieldLabel>
              <Input id="edit-name" {...editForm.register("name")} />
              <FieldError errors={[editForm.formState.errors.name]} />
            </Field>
            <Button type="submit" className="w-full" disabled={editForm.formState.isSubmitting}>
              {editForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
