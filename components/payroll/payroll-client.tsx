"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, useWatch, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Trash2, Vault, Banknote, ChevronRight, BadgeCheck, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import { NativeSelect } from "@/components/ui/native-select"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { AttachmentInput } from "@/components/ui/attachment-input"
import { useAttachmentUpload } from "@/hooks/use-attachment-upload"
import { cn, formatDate, formatCLP } from "@/lib/utils"
import { createPayrollSchema, type CreatePayrollInput } from "@/lib/validators/payroll"
import type { payrollService } from "@/services/payroll/payroll.service"
import type { severanceReserveService } from "@/services/payroll/severance-reserve.service"
import { createPayroll, addSeveranceAdjustment } from "@/app/actions/payroll"

type PayrollRecord = Awaited<ReturnType<typeof payrollService.list>>[number]
type SeveranceAdjustment = Awaited<
  ReturnType<typeof severanceReserveService.listAdjustments>
>[number]

type PayrollFormValues = Omit<CreatePayrollInput, "lines" | "liquidacion"> & {
  lines: (Omit<CreatePayrollInput["lines"][number], "amount"> & { amount: string })[]
  liquidacion?: CreatePayrollInput["liquidacion"]
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
]

const FIELD_LABEL_CLASS = "text-[11.5px] font-semibold normal-case tracking-normal text-muted-foreground"

function buildPeriod(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`
}

function parsePeriod(period: string | undefined) {
  const now = new Date()
  if (!period) return { month: now.getMonth() + 1, year: now.getFullYear() }
  const [year, month] = period.split("-").map(Number)
  return { month, year }
}

function PayrollPeriodFields({
  form
}: {
  form: ReturnType<typeof useForm<PayrollFormValues, unknown, CreatePayrollInput>>
}) {
  const period = useWatch({ control: form.control, name: "period" })
  const { month, year } = parsePeriod(period)
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-3">
      <Field
        data-invalid={!!form.formState.errors.period || undefined}
        data-testid="period-date-trigger"
      >
        <FieldLabel className={cn(FIELD_LABEL_CLASS, "flex items-center gap-1.5")}>
          <Calendar className="size-3.5" />
          Período (mes) *
        </FieldLabel>
        <NativeSelect
          value={month}
          onChange={(e) => form.setValue("period", buildPeriod(Number(e.target.value), year))}
        >
          {MONTHS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <FieldError errors={[form.formState.errors.period]} />
      </Field>
      <Field>
        <FieldLabel className={FIELD_LABEL_CLASS}>Año *</FieldLabel>
        <NativeSelect
          value={year}
          onChange={(e) => form.setValue("period", buildPeriod(month, Number(e.target.value)))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  )
}

function PayrollLineFields({
  index,
  form,
  onRemove,
  removable
}: {
  index: number
  form: ReturnType<typeof useForm<PayrollFormValues, unknown, CreatePayrollInput>>
  onRemove: () => void
  removable: boolean
}) {
  const errors = form.formState.errors.lines?.[index]

  return (
    <div
      className="rounded-lg border border-border p-4 space-y-4"
      data-testid={`payroll-line-${index}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
          Transferencia {index + 1}
        </span>
        {removable && (
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onRemove}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <Field data-invalid={!!errors?.title || undefined}>
        <FieldLabel className={FIELD_LABEL_CLASS}>Título *</FieldLabel>
        <Input
          placeholder="Ej: Sueldo pastor, Imposiciones"
          {...form.register(`lines.${index}.title`)}
        />
        <FieldError errors={[errors?.title]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors?.amount || undefined}>
          <FieldLabel className={FIELD_LABEL_CLASS}>Monto (CLP) *</FieldLabel>
          <Controller
            control={form.control}
            name={`lines.${index}.amount`}
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={(value) => field.onChange(value === undefined ? "" : String(value))}
                onBlur={field.onBlur}
              />
            )}
          />
          <FieldError errors={[errors?.amount]} />
        </Field>
        <Field data-invalid={!!errors?.movement_date || undefined}>
          <FieldLabel className={FIELD_LABEL_CLASS}>Fecha de la transferencia *</FieldLabel>
          <Controller
            control={form.control}
            name={`lines.${index}.movement_date`}
            render={({ field }) => (
              <DatePicker
                className="h-9 rounded-md px-2.5 text-sm font-normal shadow-xs"
                value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                onChange={(date) =>
                  field.onChange(
                    date
                      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                      : ""
                  )
                }
              />
            )}
          />
          <FieldError errors={[errors?.movement_date]} />
        </Field>
      </div>
      <Field>
        <FieldLabel className={FIELD_LABEL_CLASS}>Entregado a</FieldLabel>
        <Input placeholder="Opcional" {...form.register(`lines.${index}.delivered_by`)} />
      </Field>
      <Field>
        <FieldLabel className={FIELD_LABEL_CLASS}>Notas</FieldLabel>
        <Input placeholder="Observaciones opcionales" {...form.register(`lines.${index}.notes`)} />
      </Field>
    </div>
  )
}

function PayrollLineAttachment({
  index,
  form,
  onUploadingChange
}: {
  index: number
  form: ReturnType<typeof useForm<PayrollFormValues, unknown, CreatePayrollInput>>
  onUploadingChange: (key: string, isUploading: boolean) => void
}) {
  const attachmentUpload = useAttachmentUpload()
  const title = useWatch({ control: form.control, name: `lines.${index}.title` })
  const key = `line-${index}`

  // Each line has its own independent Drive-upload hook, so the submit button
  // can't just check a single isUploading flag — it needs to know if ANY line
  // still has an upload in flight, otherwise a submit mid-upload would silently
  // create the payroll record without that line's attachment.
  useEffect(() => {
    onUploadingChange(key, attachmentUpload.isUploading)
    return () => onUploadingChange(key, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentUpload.isUploading, key])

  // Attachments live in local hook state (Drive upload is async and pre-submission,
  // same pattern as every other attachment flow in this app) — synced into the form's
  // own array field so a single form.handleSubmit(...) picks them up at submit time.
  const syncAttachments = () => {
    form.setValue(
      `lines.${index}.attachments`,
      attachmentUpload.items.map((item) => ({
        driveFileId: item.driveFileId,
        driveViewLink: item.driveViewLink,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
      }))
    )
  }

  return (
    <Field>
      <FieldLabel className={FIELD_LABEL_CLASS}>
        Comprobante — {title || `Transferencia ${index + 1}`}
      </FieldLabel>
      <AttachmentInput
        items={attachmentUpload.items}
        isUploading={attachmentUpload.isUploading}
        onAddFiles={async (files) => {
          await attachmentUpload.addFiles(files)
          syncAttachments()
        }}
        onRemove={(id) => {
          attachmentUpload.remove(id)
          syncAttachments()
        }}
      />
    </Field>
  )
}

function LiquidacionAttachment({
  form,
  onUploadingChange
}: {
  form: ReturnType<typeof useForm<PayrollFormValues, unknown, CreatePayrollInput>>
  onUploadingChange: (key: string, isUploading: boolean) => void
}) {
  const attachmentUpload = useAttachmentUpload()

  useEffect(() => {
    onUploadingChange("liquidacion", attachmentUpload.isUploading)
    return () => onUploadingChange("liquidacion", false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentUpload.isUploading])

  const syncLiquidacion = () => {
    const item = attachmentUpload.items[0]
    form.setValue(
      "liquidacion",
      item
        ? {
            driveFileId: item.driveFileId,
            driveViewLink: item.driveViewLink,
            fileName: item.fileName,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes
          }
        : undefined
    )
  }

  return (
    <Field data-invalid={!!form.formState.errors.liquidacion || undefined}>
      <FieldLabel className={FIELD_LABEL_CLASS}>Liquidación *</FieldLabel>
      <AttachmentInput
        items={attachmentUpload.items}
        isUploading={attachmentUpload.isUploading}
        disabled={attachmentUpload.items.length > 0}
        maxReachedMessage="Solo se permite un archivo de liquidación"
        onAddFiles={async (files) => {
          await attachmentUpload.addFiles(files)
          syncLiquidacion()
        }}
        onRemove={(id) => {
          attachmentUpload.remove(id)
          syncLiquidacion()
        }}
      />
      {!!form.formState.errors.liquidacion && (
        <p className="text-xs text-destructive">Debes adjuntar la liquidación</p>
      )}
    </Field>
  )
}

function emptyLine(title: string) {
  return {
    title,
    amount: "",
    movement_date: "",
    delivered_by: "Pastor",
    notes: "",
    attachments: []
  }
}

function PayrollHistory({ records }: { records: PayrollRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin remuneraciones registradas aún.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {records.map((record) => {
        const total = record.payroll_movements.reduce(
          (sum, pm) => sum + Number(pm.movements?.amount ?? 0),
          0
        )
        const lineCount = record.payroll_movements.length
        return (
          <Link
            key={record.id}
            href={`/payroll/${record.id}`}
            className="rounded-xl border border-border overflow-hidden flex items-center gap-3.5 px-[18px] py-4 hover:bg-muted transition-colors"
          >
            <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-primary-surface">
              <Banknote className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold capitalize">{formatDate(record.period)}</div>
              <div className="text-[11.5px] text-muted-foreground">
                {lineCount} {lineCount === 1 ? "transferencia" : "transferencias"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-extrabold">{formatCLP(total)}</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        )
      })}
    </div>
  )
}

export function PayrollClient({
  records,
  severanceBalance,
  severanceAdjustments
}: {
  records: PayrollRecord[]
  severanceBalance: number
  severanceAdjustments: SeveranceAdjustment[]
}) {
  const router = useRouter()
  const [payrollOpen, setPayrollOpen] = useState(false)
  const recentAdjustments = severanceAdjustments.slice(0, 3)

  const defaultLines = () => [emptyLine("Sueldo pastor"), emptyLine("Imposiciones")]

  const form = useForm<PayrollFormValues, unknown, CreatePayrollInput>({
    resolver: zodResolver(createPayrollSchema) as Resolver<
      PayrollFormValues,
      unknown,
      CreatePayrollInput
    >,
    defaultValues: {
      period: buildPeriod(new Date().getMonth() + 1, new Date().getFullYear()),
      liquidacion: undefined,
      lines: defaultLines()
    }
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" })
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({})
  const anyLineUploading = Object.values(uploadingKeys).some(Boolean)
  const handleUploadingChange = (key: string, isUploading: boolean) =>
    setUploadingKeys((prev) => ({ ...prev, [key]: isUploading }))
  // Bumped on every reset so the attachment subcomponents (which each own their
  // own useAttachmentUpload hook) remount and drop their local upload state —
  // same effect useFieldArray gets for free on `lines` via fresh field ids.
  const [formInstanceKey, setFormInstanceKey] = useState(0)
  // The monthly severance reserve isn't part of createPayrollSchema (it's a
  // separate, pre-existing action — see handleAdjust below) but the design
  // bundles both into one registration step, so we collect it here and fire
  // addSeveranceAdjustment right after createPayroll succeeds.
  const [severanceAmount, setSeveranceAmount] = useState("")

  const lineAmounts = useWatch({ control: form.control, name: "lines" })
  const periodTotal = (lineAmounts ?? []).reduce((sum, l) => sum + (Number(l?.amount) || 0), 0)

  function resetPayrollForm() {
    form.reset({
      period: buildPeriod(new Date().getMonth() + 1, new Date().getFullYear()),
      liquidacion: undefined,
      lines: defaultLines()
    })
    setSeveranceAmount("")
    setUploadingKeys({})
    setFormInstanceKey((k) => k + 1)
  }

  async function handleCreatePayroll(values: CreatePayrollInput) {
    try {
      await createPayroll(values)
      const reserveAmount = Number(severanceAmount)
      if (reserveAmount > 0) {
        const { month, year } = parsePeriod(values.period)
        await addSeveranceAdjustment({
          period: values.period,
          amount_delta: reserveAmount,
          note: `Reserva mensual de remuneración — ${MONTHS[month - 1]} ${year}`
        })
      }
      setPayrollOpen(false)
      resetPayrollForm()
      toast.success("Remuneración registrada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la remuneración")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-start">
      <div className="rounded-[18px] bg-sidebar text-sidebar-foreground p-[22px] flex flex-col gap-4">
        <div className="flex items-center justify-between mb-[2px]">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-sidebar-foreground/70">
            Fondo de indemnización
          </span>
          <Vault className="size-4 text-sidebar-foreground/70" />
        </div>
        <div>
          <p className="text-[28px] font-extrabold leading-none mb-1">
            {formatCLP(severanceBalance)}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-sidebar-foreground/65">
            Monto acumulado que se reserva mes a mes. No se paga ni se transfiere; se entrega al
            pastor cuando se retire.
          </p>
        </div>

        {recentAdjustments.length > 0 && (
          <div className="flex flex-col gap-2">
            {recentAdjustments.map((adj) => (
              <div
                key={adj.id}
                className="flex items-center justify-between rounded-[9px] bg-white/10 px-3 py-[9px]"
              >
                <span className="text-xs font-semibold text-sidebar-foreground/90 capitalize">
                  {formatDate(adj.period)}
                </span>
                <span className="text-[12.5px] font-extrabold">
                  {Number(adj.amount_delta) > 0 ? "+" : ""}
                  {formatCLP(Number(adj.amount_delta))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="p-[22px] rounded-[18px] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Remuneraciones registradas</h2>
          <Dialog
            open={payrollOpen}
            onOpenChange={(o) => {
              setPayrollOpen(o)
              if (!o) resetPayrollForm()
            }}
          >
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-4" />
                  Registrar remuneración
                </Button>
              }
            />
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar remuneración</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleCreatePayroll)} className="space-y-5 pt-2">
                <Alert variant="info" icon={Banknote}>
                  <AlertDescription>
                    Registra las transferencias del mes. Cada línea genera un egreso con categoría
                    Remuneraciones.
                  </AlertDescription>
                </Alert>

                <PayrollPeriodFields form={form} />

                <div className="rounded-xl border border-border bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary">
                    <Vault className="size-4" />
                    Reserva de indemnización del mes *
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Monto que se reserva este mes para el fondo del pastor. No genera transferencia;
                    solo se contabiliza y suma al fondo acumulado.
                  </p>
                  <CurrencyInput
                    data-testid="severance-reserve-input"
                    value={severanceAmount}
                    onChange={(value) =>
                      setSeveranceAmount(value === undefined ? "" : String(value))
                    }
                    className="bg-card"
                  />
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <PayrollLineFields
                      key={field.id}
                      index={index}
                      form={form}
                      onRemove={() => remove(index)}
                      removable={fields.length > 1}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => append(emptyLine(""))}
                >
                  <Plus className="size-4" />
                  Agregar otra transferencia
                </Button>

                <div className="space-y-3">
                  <span className={cn(FIELD_LABEL_CLASS, "flex items-center gap-1.5")}>
                    Archivos adjuntos *
                  </span>
                  <LiquidacionAttachment
                    key={`liquidacion-${formInstanceKey}`}
                    form={form}
                    onUploadingChange={handleUploadingChange}
                  />
                  {fields.map((field, index) => (
                    <PayrollLineAttachment
                      key={field.id}
                      index={index}
                      form={form}
                      onUploadingChange={handleUploadingChange}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total del período
                  </span>
                  <span className="text-base font-extrabold tabular-nums">
                    {formatCLP(periodTotal)}
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    form.formState.isSubmitting ||
                    anyLineUploading ||
                    !(Number(severanceAmount) > 0)
                  }
                >
                  <BadgeCheck className="size-4" />
                  {form.formState.isSubmitting
                    ? "Guardando..."
                    : anyLineUploading
                      ? "Subiendo comprobantes..."
                      : "Registrar remuneración"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <PayrollHistory records={records} />
      </Card>
    </div>
  )
}
