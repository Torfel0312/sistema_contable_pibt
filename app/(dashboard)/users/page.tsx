import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { UsersManager } from "@/components/users/users-manager"
import { usersService } from "@/services/users/users.service"

export default async function UsersPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_USERS)) {
    redirect("/dashboard")
  }
  const users = await usersService.list()

  return (
    <section className="mx-auto max-w-6xl flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de usuarios del sistema (solo administradores).
        </p>
      </div>

      <Suspense>
        <UsersManager initialUsers={users} />
      </Suspense>
    </section>
  )
}
