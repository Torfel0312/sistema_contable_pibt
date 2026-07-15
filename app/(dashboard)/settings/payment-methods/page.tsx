import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { paymentMethodsService } from "@/services/payment-methods/payment-methods.service"
import { PaymentMethodsClient } from "@/components/settings/payment-methods-client"

export default async function PaymentMethodsSettingsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) redirect("/dashboard")

  const db = await createSupabaseServerClient()
  const paymentMethods = await paymentMethodsService.list(db)

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Medios de Pago
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo de medios de pago disponibles al registrar movimientos.
        </p>
      </div>
      <PaymentMethodsClient initialPaymentMethods={paymentMethods} />
    </div>
  )
}
