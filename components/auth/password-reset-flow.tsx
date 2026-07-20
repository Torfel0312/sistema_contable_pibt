"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { RecoverySteps } from "@/components/auth/recovery-steps"
import { SetPasswordForm } from "@/components/auth/set-password-form"

export function PasswordResetFlow({ email }: { email: string }) {
  const router = useRouter()
  const [done, setDone] = useState(false)

  const goToLogin = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  if (done) {
    return (
      <div className="w-full">
        <RecoverySteps current={3} />

        <div className="flex size-[52px] items-center justify-center rounded-[14px] bg-income-soft mb-[18px]">
          <CheckCircle2 className="size-6 text-income" />
        </div>

        <h1 className="font-heading text-[26px] font-extrabold tracking-tight text-foreground mb-1.5">
          Contraseña actualizada
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-muted-foreground mb-[26px]">
          Tu contraseña fue restablecida correctamente. Por seguridad, cerramos las sesiones
          abiertas en otros dispositivos.
        </p>

        <Button type="button" className="w-full" onClick={goToLogin}>
          Ir a iniciar sesión
          <ArrowRight className="size-[15px]" data-icon="inline-end" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <RecoverySteps current={2} />

      <h1 className="font-heading text-[26px] font-extrabold tracking-tight text-foreground mb-1.5">
        Crea una nueva contraseña
      </h1>
      <p className="text-[13.5px] leading-[1.55] text-muted-foreground mb-[26px]">
        Para la cuenta <strong className="text-foreground">{email}</strong>
      </p>

      <SetPasswordForm
        showRequirements
        submitLabel="Restablecer contraseña"
        onSuccess={() => setDone(true)}
      />
    </div>
  )
}
