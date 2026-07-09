"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { updateSettingsSchema } from "@/lib/validators/settings"
import type { UpdateSettingsInput } from "@/lib/validators/settings"
import type { AppSettings } from "@/services/settings/settings.service"
import { updateSettings } from "@/app/actions/settings"

export function SettingsClient({ initialSettings }: { initialSettings: AppSettings }) {
  const form = useForm<z.input<typeof updateSettingsSchema>, unknown, UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      tesoreria_notification_email: initialSettings.tesoreria_notification_email,
      voucher_email: initialSettings.voucher_email,
      reminder_interval_days: String(initialSettings.reminder_interval_days)
    }
  })

  async function handleSave(values: UpdateSettingsInput) {
    try {
      await updateSettings(values)
      toast.success("Configuración guardada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes del flujo de aprobación de solicitudes
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
          <Field>
            <FieldLabel htmlFor="tesoreria-email">Email de notificación — Tesorería</FieldLabel>
            <Input
              id="tesoreria-email"
              type="email"
              placeholder="tesoreria@pibtalcahuano.com"
              {...form.register("tesoreria_notification_email")}
            />
            <p className="text-xs text-muted-foreground">
              Recibe alertas de nuevas solicitudes y recordatorios de pendientes.
            </p>
            <FieldError errors={[form.formState.errors.tesoreria_notification_email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="voucher-email">Email de comprobante — Ministros</FieldLabel>
            <Input
              id="voucher-email"
              type="email"
              placeholder="notificaciones@pibtalcahuano.com"
              {...form.register("voucher_email")}
            />
            <p className="text-xs text-muted-foreground">
              Si está vacío, los correos se envían al email registrado de cada ministro.
            </p>
            <FieldError errors={[form.formState.errors.voucher_email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="reminder-days">Intervalo de recordatorios (días)</FieldLabel>
            <Input
              id="reminder-days"
              type="number"
              min={1}
              max={30}
              {...form.register("reminder_interval_days")}
            />
            <p className="text-xs text-muted-foreground">
              Si una solicitud lleva este número de días sin respuesta, se envía un recordatorio a
              tesorería.
            </p>
            <FieldError errors={[form.formState.errors.reminder_interval_days]} />
          </Field>

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? "Guardando..." : "Guardar configuración"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
