import { redirect } from "next/navigation"
import { MovementForm } from "@/components/movements/movement-form"
import { MovementWizard } from "@/components/movements/movement-wizard"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { paymentMethodsService } from "@/services/payment-methods/payment-methods.service"
import { categoriesService, subcategoriesService } from "@/services/categories/categories.service"

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
  const [paymentMethods, categories, subcategories] = await Promise.all([
    paymentMethodsService.list(db),
    categoriesService.list(db),
    subcategoriesService.list(db)
  ])

  // Defensive: the "Aporte de Capital" category is seeded by migration and
  // should always exist, but fall back to no default rather than crashing
  // the "Inyectar capital" quick-entry flow if it's ever missing/renamed.
  const capitalInjectionCategoryId = isCapitalInjection
    ? categories.find((c) => c.name === "Aporte de Capital" && c.movement_type === "INCOME")?.id
    : undefined

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
      {isCapitalInjection ? (
        <div className="rounded-xl bg-card border border-border p-6 sm:p-10">
          <MovementForm
            mode="create"
            paymentMethods={paymentMethods}
            categories={categories}
            subcategories={subcategories}
            isCapitalInjection
            defaultValues={{ movement_type: "INCOME", category_id: capitalInjectionCategoryId }}
          />
        </div>
      ) : (
        <div className="max-w-2xl w-full mx-auto">
          <MovementWizard
            mode="create"
            paymentMethods={paymentMethods}
            categories={categories}
            subcategories={subcategories}
          />
        </div>
      )}
    </div>
  )
}
