import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { settingsService } from "@/services/settings/settings.service"
import { getPermissionMap } from "@/services/permissions/permissions.service"
import { inboundRoutesService } from "@/services/email/inbound-routes.service"
import { usersService } from "@/services/users/users.service"
import { SettingsClient } from "@/components/settings/settings-client"
import { PermissionsMatrix } from "@/components/configuration/permissions-matrix"
import { InboundEmailRoutesSection } from "@/components/settings/inbound-email-routes-section"

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()
  const [settings, permMap, routes, users] = await Promise.all([
    settingsService.getAll(supabase),
    getPermissionMap(supabase),
    inboundRoutesService.list(supabase),
    usersService.list()
  ])

  const matrixData: Record<string, Record<string, boolean>> = {}
  for (const [role, perms] of Object.entries(permMap)) {
    matrixData[role] = {}
    for (const permission of Object.values(PERMISSIONS)) {
      matrixData[role][permission] = perms.has(permission)
    }
  }

  const activeUsers = users
    .filter((u) => u.status === "ACTIVE")
    .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email }))

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustes del sistema y permisos por rol.
        </p>
      </div>
      <SettingsClient initialSettings={settings} />
      <InboundEmailRoutesSection initialRoutes={routes} users={activeUsers} />
      <PermissionsMatrix initialMatrix={matrixData} />
    </div>
  )
}
