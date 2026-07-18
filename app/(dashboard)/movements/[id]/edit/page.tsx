type Props = { params: Promise<{ id: string }> }
import { notFound, redirect } from "next/navigation"
import { MovementForm } from "@/components/movements/movement-form"
import { movementsService } from "@/services/movements/movements.service"
import { paymentMethodsService } from "@/services/payment-methods/payment-methods.service"
import { categoriesService, subcategoriesService } from "@/services/categories/categories.service"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"

export default async function EditMovementPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!(can(user?.permissions, PERMISSIONS.CREATE_MOVEMENT) ?? false)) {
    redirect(`/movements/${id}`)
  }

  const db = await createSupabaseServerClient()
  const [movement, paymentMethods, categories, subcategories] = await Promise.all([
    movementsService.findById(db, id).catch(() => null),
    paymentMethodsService.list(db),
    categoriesService.list(db),
    subcategoriesService.list(db)
  ])
  if (!movement) notFound()
  if (movement.status === "CANCELLED") redirect(`/movements/${id}`)

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Editar Movimiento
        </h1>
        <p className="text-sm text-muted-foreground">
          Solo se permite editar movimientos en estado activo.
        </p>
      </div>

      <div className="rounded-xl bg-card border border-border p-6 sm:p-10">
        <MovementForm
          mode="edit"
          movement={movement}
          paymentMethods={paymentMethods}
          categories={categories}
          subcategories={subcategories}
        />
      </div>
    </div>
  )
}
