import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { getPermissionMap } from "@/services/permissions/permissions.service"
import { PermissionsMatrix } from "@/components/configuration/permissions-matrix"

export default async function PermissionsSettingsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()
  const permMap = await getPermissionMap(supabase)

  const matrixData: Record<string, Record<string, boolean>> = {}
  for (const [role, perms] of Object.entries(permMap)) {
    matrixData[role] = {}
    for (const permission of Object.values(PERMISSIONS)) {
      matrixData[role][permission] = perms.has(permission)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Permisos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Permisos por rol.</p>
      </div>
      <PermissionsMatrix initialMatrix={matrixData} />
    </div>
  )
}
