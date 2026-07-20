import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default async function ForgotPasswordPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <AuthShell
      maxWidth="380px"
      bottom={
        <div className="flex flex-col gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/[0.12]">
            <ShieldCheck className="size-[22px]" />
          </div>
          <p className="text-[19px] leading-[1.5] font-medium text-primary-foreground">
            Tu cuenta protege información financiera sensible. Sigue los pasos para restablecer
            tu acceso de forma segura.
          </p>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground/60">
            Recuperación de cuenta
          </span>
        </div>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
