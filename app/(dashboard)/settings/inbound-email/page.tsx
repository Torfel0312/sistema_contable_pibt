import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { inboundRoutesService } from "@/services/email/inbound-routes.service"
import { usersService } from "@/services/users/users.service"
import { InboundEmailRoutesSection } from "@/components/settings/inbound-email-routes-section"

export default async function InboundEmailSettingsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()
  const [routes, users] = await Promise.all([
    inboundRoutesService.list(supabase),
    usersService.list()
  ])

  const activeUsers = users
    .filter((u) => u.status === "ACTIVE")
    .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email }))

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Correo entrante
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas de reenvío de correos entrantes a usuarios internos.
        </p>
      </div>
      <InboundEmailRoutesSection initialRoutes={routes} users={activeUsers} />
    </div>
  )
}
