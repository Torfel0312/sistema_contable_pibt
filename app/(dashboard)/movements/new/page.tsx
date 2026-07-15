import { redirect } from "next/navigation"
import { MovementForm } from "@/components/movements/movement-form"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { paymentMethodsService } from "@/services/payment-methods/payment-methods.service"

type Props = {
  searchParams: Promise<{ capitalInjection?: string }>
}

export default async function NewMovementPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (!(can(user?.permissions, PERMISSIONS.CREATE_MOVEMENT) ?? false)) {
    redirect("/movements")
  }

  const { capitalInjection } = await searchParams
  const isCapitalInjection = capitalInjection === "1"

  const db = await createSupabaseServerClient()
  const paymentMethods = await paymentMethodsService.list(db)

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {isCapitalInjection ? "Inyectar Capital" : "Registro de Movimiento"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isCapitalInjection
            ? "Registro de un aporte de capital como ingreso."
            : "Formulario para el control de ingresos y egresos."}
        </p>
      </div>
      <div className="rounded-xl bg-card border border-border p-6 sm:p-10">
        <MovementForm
          mode="create"
          paymentMethods={paymentMethods}
          isCapitalInjection={isCapitalInjection}
          defaultValues={
            isCapitalInjection
              ? { movement_type: "INCOME", category: "Aporte de Capital" }
              : undefined
          }
        />
      </div>
    </div>
  )
}
