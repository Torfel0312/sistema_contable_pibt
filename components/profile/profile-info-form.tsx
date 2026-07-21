"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { updateOwnProfileSchema, type UpdateOwnProfileInput } from "@/lib/validators/user"
import { updateOwnProfile } from "@/app/actions/users"

export function ProfileInfoForm({ fullName, email }: { fullName: string; email: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<UpdateOwnProfileInput>({
    resolver: zodResolver(updateOwnProfileSchema),
    defaultValues: { full_name: fullName }
  })

  async function onSubmit(values: UpdateOwnProfileInput) {
    try {
      await updateOwnProfile(values)
      toast.success("Perfil actualizado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el perfil")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.full_name || undefined}>
          <FieldLabel htmlFor="profile-name">Nombre completo</FieldLabel>
          <Input id="profile-name" {...register("full_name")} />
          <FieldError errors={[errors.full_name]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-email">Correo electrónico</FieldLabel>
          <Input id="profile-email" value={email} disabled className="text-muted-foreground" />
        </Field>
      </div>
      <Button type="submit" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  )
}
