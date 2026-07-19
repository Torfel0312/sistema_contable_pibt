import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { SetPasswordForm } from "@/components/auth/set-password-form"
import { AuthShell } from "@/components/auth/auth-shell"

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
    <AuthShell
      bottom={
        <div className="flex flex-col gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/[0.12]">
            <ShieldCheck className="size-[22px]" />
          </div>
          <p className="text-[19px] leading-[1.5] font-medium text-primary-foreground/90">
            Tu cuenta protege información financiera sensible. Sigue los pasos para restablecer
            tu acceso de forma segura.
          </p>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground/60">
            {isReset ? "Recuperación de cuenta" : "Activación de cuenta"}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5 mb-7">
        <h1 className="font-heading text-[26px] font-extrabold tracking-tight text-foreground">
          {isReset ? "Crea una nueva contraseña" : "Activa tu cuenta"}
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          {isReset
            ? "Crea una nueva contraseña para restablecer tu acceso."
            : `Hola ${profile.full_name}, establece tu contraseña para comenzar.`}
        </p>
      </div>

      <SetPasswordForm />
    </AuthShell>
  )
}
