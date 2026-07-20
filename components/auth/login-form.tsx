"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

const loginSchema = z.object({
  email: z.email("Ingresa un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const urlError = searchParams.get("error")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  })

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email.toLowerCase().trim(),
      password: values.password
    })

    if (authError) {
      setError("Credenciales inválidas o usuario inactivo.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel
            htmlFor="email"
            className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
          >
            Correo electrónico
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="correo@iglesia.cl"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password || undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel
              htmlFor="password"
              className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
            >
              Contraseña
            </FieldLabel>
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>

      {urlError && (
        <Alert variant="destructive">
          <AlertDescription>
            {urlError === "link_expired"
              ? "El enlace ha expirado. Solicita uno nuevo."
              : "Ocurrió un error. Intenta nuevamente."}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full transition-colors">
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            Verificando...
          </>
        ) : (
          "Ingresar"
        )}
      </Button>
    </form>
  )
}
