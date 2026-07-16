"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Trash2, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { AttachmentInput } from "@/components/ui/attachment-input"
import { useAttachmentUpload } from "@/hooks/use-attachment-upload"
import { formatDate, formatCLP } from "@/lib/utils"
import {
  createPayrollSchema,
  severanceAdjustmentSchema,
  type CreatePayrollInput,
  type SeveranceAdjustmentInput
} from "@/lib/validators/payroll"
import type { payrollService } from "@/services/payroll/payroll.service"
import type { severanceReserveService } from "@/services/payroll/severance-reserve.service"
import { createPayroll, addSeveranceAdjustment } from "@/app/actions/payroll"

type PayrollRecord = Awaited<ReturnType<typeof payrollService.list>>[number]
type SeveranceAdjustment = Awaited<ReturnType<typeof severanceReserveService.listAdjustments>>[number]

const KIND_LABELS: Record<string, string> = {
  SALARY: "Sueldo",
  CONTRIBUTIONS: "Imposiciones",
  OTHER: "Otro"
}

type PayrollFormValues = Omit<CreatePayrollInput, "lines"> & {
  lines: (Omit<CreatePayrollInput["lines"][number], "amount"> & { amount: string })[]
}

function PayrollLineFields({
  index,
  form,
  onRemove,
  removable,
  onUploadingChange
}: {
  index: number
  form: ReturnType<typeof useForm<PayrollFormValues, unknown, CreatePayrollInput>>
  onRemove: () => void
  removable: boolean
  onUploadingChange: (index: number, isUploading: boolean) => void
}) {
  const attachmentUpload = useAttachmentUpload()
  const errors = form.formState.errors.lines?.[index]

  // Each line has its own independent Drive-upload hook, so the submit button
  // can't just check a single isUploading flag — it needs to know if ANY line
  // still has an upload in flight, otherwise a submit mid-upload would silently
  // create the payroll record without that line's attachment.
  useEffect(() => {
    onUploadingChange(index, attachmentUpload.isUploading)
    return () => onUploadingChange(index, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentUpload.isUploading, index])

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
    <div className="rounded-lg border border-border p-4 space-y-4" data-testid={`payroll-line-${index}`}>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Transferencia {index + 1}
        </span>
        {removable && (
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onRemove}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Tipo *</FieldLabel>
          <NativeSelect {...form.register(`lines.${index}.kind`)}>
            <NativeSelectOption value="SALARY">Sueldo</NativeSelectOption>
            <NativeSelectOption value="CONTRIBUTIONS">Imposiciones</NativeSelectOption>
            <NativeSelectOption value="OTHER">Otro</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field data-invalid={!!errors?.amount || undefined}>
          <FieldLabel>Monto (CLP) *</FieldLabel>
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
          <FieldLabel>Fecha de la transferencia *</FieldLabel>
          <Controller
            control={form.control}
            name={`lines.${index}.movement_date`}
            render={({ field }) => (
              <DatePicker
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
        <Field>
          <FieldLabel>Entregado a</FieldLabel>
          <Input placeholder="Opcional" {...form.register(`lines.${index}.delivered_by`)} />
        </Field>
      </div>
      <Field>
        <FieldLabel>Notas</FieldLabel>
        <Input placeholder="Observaciones opcionales" {...form.register(`lines.${index}.notes`)} />
      </Field>
      <Field>
        <FieldLabel>Comprobante</FieldLabel>
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
    </div>
  )
}

function emptyLine() {
  return {
    kind: "SALARY" as const,
    amount: "",
    movement_date: "",
    delivered_by: "",
    notes: "",
    attachments: []
  }
}

function PayrollHistory({ records }: { records: PayrollRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin remuneraciones registradas aún.</p>
  }
  return (
    <div className="space-y-3">
      {records.map((record) => {
        const total = record.payroll_movements.reduce(
          (sum, pm) => sum + Number(pm.movements?.amount ?? 0),
          0
        )
        return (
          <div key={record.id} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{formatDate(record.period)}</span>
              <span className="font-semibold">{formatCLP(total)}</span>
            </div>
            {record.liquidacion_reference && (
              <p className="text-xs text-muted-foreground">
                Ref. liquidación: {record.liquidacion_reference}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {record.payroll_movements.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {KIND_LABELS[pm.kind] ?? pm.kind} · Folio {pm.movements?.folio_display}
                  </span>
                  <span>{formatCLP(Number(pm.movements?.amount ?? 0))}</span>
                </div>
              ))}
            </div>
          </div>
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
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const form = useForm<PayrollFormValues, unknown, CreatePayrollInput>({
    resolver: zodResolver(createPayrollSchema) as Resolver<
      PayrollFormValues,
      unknown,
      CreatePayrollInput
    >,
    defaultValues: {
      period: "",
      liquidacion_reference: "",
      lines: [emptyLine()]
    }
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" })
  const [uploadingLines, setUploadingLines] = useState<Record<number, boolean>>({})
  const anyLineUploading = Object.values(uploadingLines).some(Boolean)
  const handleUploadingChange = (index: number, isUploading: boolean) =>
    setUploadingLines((prev) => ({ ...prev, [index]: isUploading }))

  const adjustForm = useForm<SeveranceAdjustmentInput>({
    resolver: zodResolver(severanceAdjustmentSchema),
    defaultValues: { amount_delta: 0, note: "" }
  })

  async function handleCreatePayroll(values: CreatePayrollInput) {
    try {
      await createPayroll(values)
      setPayrollOpen(false)
      form.reset({ period: "", liquidacion_reference: "", lines: [emptyLine()] })
      toast.success("Remuneración registrada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la remuneración")
    }
  }

  async function handleAdjust(values: SeveranceAdjustmentInput) {
    try {
      await addSeveranceAdjustment(values)
      setAdjustOpen(false)
      adjustForm.reset({ amount_delta: 0, note: "" })
      toast.success("Reserva ajustada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ajustar la reserva")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Wallet className="size-4" />
            Reserva de indemnización
          </h2>
          <Dialog
            open={adjustOpen}
            onOpenChange={(o) => {
              setAdjustOpen(o)
              if (!o) adjustForm.reset({ amount_delta: 0, note: "" })
            }}
          >
            <DialogTrigger render={<Button size="sm">Ajustar reserva</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajustar reserva de indemnización</DialogTitle>
              </DialogHeader>
              <form onSubmit={adjustForm.handleSubmit(handleAdjust)} className="space-y-4 pt-2">
                <Field data-invalid={!!adjustForm.formState.errors.amount_delta || undefined}>
                  <FieldLabel>Monto del ajuste (CLP) *</FieldLabel>
                  <Controller
                    control={adjustForm.control}
                    name="amount_delta"
                    render={({ field }) => (
                      <Input
                        type="number"
                        placeholder="Positivo para sumar, negativo para restar"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  <FieldError errors={[adjustForm.formState.errors.amount_delta]} />
                </Field>
                <Field data-invalid={!!adjustForm.formState.errors.note || undefined}>
                  <FieldLabel>Motivo *</FieldLabel>
                  <Input placeholder="Razón del ajuste" {...adjustForm.register("note")} />
                  <FieldError errors={[adjustForm.formState.errors.note]} />
                </Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={adjustForm.formState.isSubmitting}
                >
                  {adjustForm.formState.isSubmitting ? "Guardando..." : "Confirmar ajuste"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-2xl font-bold">{formatCLP(severanceBalance)}</p>
        {severanceAdjustments.length > 0 && (
          <div>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setHistoryOpen((o) => !o)}
            >
              {historyOpen ? "Ocultar historial" : "Ver historial de ajustes"}
            </button>
            {historyOpen && (
              <div className="mt-2 flex flex-col gap-1.5">
                {severanceAdjustments.map((adj) => (
                  <div key={adj.id} className="text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {formatDate(adj.created_at)} · {adj.note}
                    </span>
                    <span className={Number(adj.amount_delta) < 0 ? "text-destructive" : ""}>
                      {Number(adj.amount_delta) > 0 ? "+" : ""}
                      {formatCLP(Number(adj.amount_delta))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Remuneraciones registradas</h2>
          <Dialog
            open={payrollOpen}
            onOpenChange={(o) => {
              setPayrollOpen(o)
              if (!o) {
                form.reset({ period: "", liquidacion_reference: "", lines: [emptyLine()] })
                setUploadingLines({})
              }
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="size-4" />
                  Registrar remuneración
                </Button>
              }
            />
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar remuneración</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleCreatePayroll)} className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    data-invalid={!!form.formState.errors.period || undefined}
                    data-testid="period-date-trigger"
                  >
                    <FieldLabel>Período (mes) *</FieldLabel>
                    <Controller
                      control={form.control}
                      name="period"
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                          onChange={(date) =>
                            field.onChange(
                              date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
                                : ""
                            )
                          }
                        />
                      )}
                    />
                    <FieldError errors={[form.formState.errors.period]} />
                  </Field>
                  <Field>
                    <FieldLabel>Referencia de liquidación</FieldLabel>
                    <Input
                      placeholder="Opcional"
                      {...form.register("liquidacion_reference")}
                    />
                  </Field>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <PayrollLineFields
                      key={field.id}
                      index={index}
                      form={form}
                      onRemove={() => remove(index)}
                      removable={fields.length > 1}
                      onUploadingChange={handleUploadingChange}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => append(emptyLine())}
                >
                  <Plus className="size-4" />
                  Agregar otra transferencia
                </Button>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting || anyLineUploading}
                >
                  {form.formState.isSubmitting
                    ? "Guardando..."
                    : anyLineUploading
                      ? "Subiendo comprobantes..."
                      : "Registrar"}
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
