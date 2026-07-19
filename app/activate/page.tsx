import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { SetPasswordForm } from "@/components/auth/set-password-form"

export default async function ActivatePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/?error=link_expired")
  }

  const admin = createSupabaseAdminClient()
  const { data: profile } = await admin
    .from("users")
    .select("status, full_name")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.status !== "PENDING_ACTIVATION" && profile.status !== "PENDING_RESET")) {
    redirect("/dashboard")
  }

  const isReset = profile.status === "PENDING_RESET"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isReset ? "Nueva contraseña" : "Activa tu cuenta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isReset
              ? "Crea una nueva contraseña para restablecer tu acceso."
              : `Hola ${profile.full_name}, establece tu contraseña para comenzar.`}
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  )
}
