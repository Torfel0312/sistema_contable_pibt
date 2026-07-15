"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MovementForm } from "./movement-form"

type PaymentMethodOption = { id: string; name: string; is_active: boolean }
type CategoryOption = { id: string; movement_type: "INCOME" | "EXPENSE"; name: string; is_active: boolean; is_system: boolean }
type SubcategoryOption = { id: string; category_id: string; name: string; is_active: boolean }

export function NewMovementDialog({
  paymentMethods,
  categories,
  subcategories
}: {
  paymentMethods: PaymentMethodOption[]
  categories: CategoryOption[]
  subcategories: SubcategoryOption[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-10 px-6">
            <Plus data-icon="inline-start" />
            Nuevo Movimiento
          </Button>
        }
      />
      <DialogContent className="w-[95vw] sm:max-w-4xl bg-card p-0 border border-border rounded-xl overflow-y-auto max-h-[90vh]">
        <div className="p-6 sm:p-10 flex flex-col gap-8">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Registro de Movimiento
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              Complete el formulario para registrar un ingreso o egreso.
            </DialogDescription>
          </DialogHeader>

          <MovementForm
            mode="create"
            paymentMethods={paymentMethods}
            categories={categories}
            subcategories={subcategories}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
