import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { settingsService } from "@/services/settings/settings.service"
import { inboundRoutesService } from "@/services/email/inbound-routes.service"
import { SettingsClient } from "@/components/settings/settings-client"

export default async function GeneralSettingsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()
  const [settings, routes] = await Promise.all([
    settingsService.getAll(supabase),
    inboundRoutesService.list(supabase)
  ])
  const mailboxGroups = [...new Set(routes.map((r) => r.local_part))].sort()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          General
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notificaciones, comprobantes y recordatorios.
        </p>
      </div>
      <SettingsClient initialSettings={settings} mailboxGroups={mailboxGroups} />
    </div>
  )
}
