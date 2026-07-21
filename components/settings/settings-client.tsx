"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight, Bell, Info, Send, ShieldCheck, AlarmClock, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { updateSettingsSchema } from "@/lib/validators/settings"
import type { UpdateSettingsInput } from "@/lib/validators/settings"
import type { AppSettings } from "@/services/settings/settings.service"
import { updateSettings } from "@/app/actions/settings"

const DOMAIN = "pibtalcahuano.com"

function SectionHeading({
  icon: Icon,
  label
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-[15px] text-primary" />
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-primary">
        {label}
      </h2>
    </div>
  )
}

function groupOptions(mailboxGroups: string[], current: string | null | undefined) {
  const emails = mailboxGroups.map((g) => `${g}@${DOMAIN}`)
  if (current && !emails.includes(current)) emails.push(current)
  return emails
}

export function SettingsClient({
  initialSettings,
  mailboxGroups
}: {
  initialSettings: AppSettings
  mailboxGroups: string[]
}) {
  const form = useForm<z.input<typeof updateSettingsSchema>, unknown, UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      tesoreria_notification_email: initialSettings.tesoreria_notification_email,
      voucher_email: initialSettings.voucher_email,
      notifications_from_email: initialSettings.notifications_from_email,
      notifications_bcc_email: initialSettings.notifications_bcc_email,
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

  const tesoreriaOptions = groupOptions(
    mailboxGroups,
    initialSettings.tesoreria_notification_email
  )
  const voucherOptions = groupOptions(mailboxGroups, initialSettings.voucher_email)

  return (
    <form
      onSubmit={form.handleSubmit(handleSave)}
      className="rounded-2xl bg-card border border-border p-[26px] flex flex-col gap-8"
    >
      <div className="flex flex-col gap-4">
        <SectionHeading icon={Bell} label="Notificaciones" />

        <div className="flex gap-2.5 rounded-[10px] bg-muted px-3.5 py-3">
          <Info className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-foreground">
            Un <strong className="font-semibold">grupo</strong> es un buzón compartido (
            <code className="text-[11px]">nombre@{DOMAIN}</code>) configurado en Correo entrante que
            reenvía a una o más personas. Úsalo aquí en vez de escribir un email individual.
            {mailboxGroups.length === 0 && (
              <>
                {" "}
                Aún no hay grupos —{" "}
                <Link
                  href="/settings/inbound-email"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  crear grupo en Correo entrante
                  <ArrowRight className="size-3" />
                </Link>
              </>
            )}
          </p>
        </div>

        {mailboxGroups.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="tesoreria-email">Grupo — Tesorería</FieldLabel>
              <NativeSelect
                id="tesoreria-email"
                {...form.register("tesoreria_notification_email")}
              >
                <NativeSelectOption value="">Sin grupo asignado</NativeSelectOption>
                {tesoreriaOptions.map((email) => (
                  <NativeSelectOption key={email} value={email}>
                    {email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Recibe alertas de nuevas solicitudes y recordatorios de pendientes.{" "}
                <Link href="/settings/inbound-email" className="underline hover:text-foreground">
                  ¿Falta el grupo? Créalo aquí
                </Link>
              </p>
              <FieldError errors={[form.formState.errors.tesoreria_notification_email]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="voucher-email">Grupo — Comprobantes a ministros</FieldLabel>
              <NativeSelect id="voucher-email" {...form.register("voucher_email")}>
                <NativeSelectOption value="">Sin grupo (usar email del ministro)</NativeSelectOption>
                {voucherOptions.map((email) => (
                  <NativeSelectOption key={email} value={email}>
                    {email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Si está vacío, se envían al email registrado de cada ministro.{" "}
                <Link href="/settings/inbound-email" className="underline hover:text-foreground">
                  ¿Falta el grupo? Créalo aquí
                </Link>
              </p>
              <FieldError errors={[form.formState.errors.voucher_email]} />
            </Field>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="notifications-from-email" className="flex items-center gap-1.5">
              <Send className="size-3.5" />
              Correo remitente de notificaciones
            </FieldLabel>
            <Input
              id="notifications-from-email"
              type="email"
              placeholder={`hola@${DOMAIN}`}
              {...form.register("notifications_from_email")}
            />
            <p className="text-xs text-muted-foreground">
              Debe ser un dominio verificado en Resend (ej.{" "}
              <code className="text-[11px]">@{DOMAIN}</code>). Si está vacío, se usa el remitente
              por defecto del sistema.
            </p>
            <FieldError errors={[form.formState.errors.notifications_from_email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="notifications-bcc-email" className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              Correo de respaldo (auditoría, BCC)
            </FieldLabel>
            <Input
              id="notifications-bcc-email"
              type="email"
              placeholder={`auditoria@${DOMAIN}`}
              {...form.register("notifications_bcc_email")}
            />
            <p className="text-xs text-muted-foreground">
              Recibe copia oculta de los correos de confirmación de recepción.
            </p>
            <FieldError errors={[form.formState.errors.notifications_bcc_email]} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <SectionHeading icon={AlarmClock} label="Recordatorios" />
        <div className="max-w-[340px]">
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
              Días sin respuesta antes de recordar a tesorería.
            </p>
            <FieldError errors={[form.formState.errors.reminder_interval_days]} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" disabled={form.formState.isSubmitting} className="px-8">
          <Save className="size-4" />
          {form.formState.isSubmitting ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  )
}
