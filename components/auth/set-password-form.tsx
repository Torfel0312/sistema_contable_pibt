"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { setPasswordSchema, type SetPasswordValues } from "@/lib/validators/auth"
import { activateAccount } from "@/app/actions/auth"

export function SetPasswordForm({
  showRequirements = false,
  submitLabel = "Establecer contraseña",
  onSuccess
}: {
  showRequirements?: boolean
  submitLabel?: string
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema)
  })

  const password = useWatch({ control, name: "password" }) ?? ""
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? ""

  const requirements = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Al menos una mayúscula", met: /[A-ZÁÉÍÓÚÑ]/.test(password) },
    { label: "Al menos un número", met: /\d/.test(password) },
    { label: "Las contraseñas coinciden", met: password.length > 0 && password === confirmPassword }
  ]
  const requirementsMet = requirements.every((r) => r.met)

  const onSubmit = async (values: SetPasswordValues) => {
    setError(null)
    const supabase = createSupabaseBrowserClient()

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password
    })

    if (updateError) {
      setError("No se pudo actualizar la contraseña. El enlace puede haber expirado.")
      return
    }

    await activateAccount()

    if (onSuccess) {
      onSuccess()
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel
            htmlFor="password"
            className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
          >
            Nueva contraseña
          </FieldLabel>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {!showRequirements && <FieldError errors={[errors.password]} />}
        </Field>

        <Field data-invalid={!!errors.confirmPassword || undefined}>
          <FieldLabel
            htmlFor="confirmPassword"
            className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
          >
            Confirmar contraseña
          </FieldLabel>
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {!showRequirements && <FieldError errors={[errors.confirmPassword]} />}
        </Field>
      </FieldGroup>

      {showRequirements && (
        <div className="flex flex-col gap-[7px]">
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-2">
              {req.met ? (
                <CheckCircle2 className="size-[14px] shrink-0 text-income" />
              ) : (
                <Circle className="size-[14px] shrink-0 text-faint" />
              )}
              <span
                className={cn(
                  "text-[12.5px] font-semibold",
                  req.met ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || (showRequirements && !requirementsMet)}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            Guardando...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}
