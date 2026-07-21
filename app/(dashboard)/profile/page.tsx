import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { KeyRound } from "lucide-react"

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestiona la seguridad de tu cuenta.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Cambiar contraseña</p>
            <p className="text-xs text-muted-foreground">
              Se cerrará tu sesión al confirmar el cambio.
            </p>
          </div>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
