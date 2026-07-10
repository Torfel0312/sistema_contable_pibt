import { redirect } from "next/navigation"
import { MovementForm } from "@/components/movements/movement-form"
import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"

export default async function NewMovementPage() {
  const user = await getCurrentUser()
  if (!(can(user?.permissions, PERMISSIONS.CREATE_MOVEMENT) ?? false)) {
    redirect("/movements")
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Registro de Movimiento
        </h1>
        <p className="text-sm text-muted-foreground">
          Formulario para el control de ingresos y egresos.
        </p>
      </div>
      <div className="rounded-xl bg-card border border-border p-6 sm:p-10">
        <MovementForm mode="create" />
      </div>
    </div>
  )
}
