"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { updateSettingsSchema } from "@/lib/validators/settings"
import type { UpdateSettingsInput } from "@/lib/validators/settings"
import type { AppSettings } from "@/services/settings/settings.service"
import { updateSettings } from "@/app/actions/settings"

const DOMAIN = "pibtalcahuano.com"

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="shrink-0 text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </h2>
      <div className="h-px flex-1 bg-border" />
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
    <form onSubmit={form.handleSubmit(handleSave)} className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-5">
        <SectionDivider label="Notificaciones" />
        <p className="text-xs text-muted-foreground">
          Un <strong className="font-medium text-foreground">grupo</strong> es un buzón compartido
          (<code className="text-[11px]">nombre@{DOMAIN}</code>) configurado en Correo entrante que
          reenvía a una o más personas. Úsalo aquí en vez de escribir un email individual.
        </p>

        {mailboxGroups.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-sm">
            <p className="text-muted-foreground">
              Todavía no hay grupos de correo entrante configurados. Crea uno para poder asignarlo
              aquí.
            </p>
            <Link
              href="/settings/inbound-email"
              className="inline-flex w-fit items-center gap-1 font-medium text-primary hover:underline"
            >
              Crear grupo en Correo entrante
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
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
      </div>

      <div className="flex flex-col gap-5">
        <SectionDivider label="Recordatorios" />
        <div className="grid gap-5 sm:grid-cols-2">
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
          {form.formState.isSubmitting ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  )
}
