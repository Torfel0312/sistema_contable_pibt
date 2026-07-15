import { redirect } from "next/navigation"
import { MovementForm } from "@/components/movements/movement-form"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { paymentMethodsService } from "@/services/payment-methods/payment-methods.service"

export default async function VoucherBookPage() {
  const user = await getCurrentUser()
  if (!(can(user?.permissions, PERMISSIONS.CREATE_MOVEMENT) ?? false)) {
    redirect("/movements")
  }

  const db = await createSupabaseServerClient()
  const paymentMethods = await paymentMethodsService.list(db)

  return (
    <section className="mx-auto max-w-5xl flex flex-col gap-8">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Talonario Unificado
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestión ágil para el registro de ingresos y egresos ministeriales.
        </p>
      </div>

      <div className="rounded-xl bg-card border border-border p-6 sm:p-10">
        <MovementForm mode="create" paymentMethods={paymentMethods} />
      </div>
    </section>
  )
}
