import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can, isImpersonating } from "@/lib/permissions/rbac"
import { UsersManager } from "@/components/users/users-manager"
import { usersService } from "@/services/users/users.service"

export default async function UsersPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_USERS) || isImpersonating(user)) {
    redirect("/dashboard")
  }
  const users = await usersService.list()

  return (
    <section className="mx-auto max-w-6xl flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mb-1">
          Usuarios
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Gestión de usuarios del sistema (solo administradores).
        </p>
      </div>

      <Suspense>
        <UsersManager initialUsers={users} />
      </Suspense>
    </section>
  )
}
