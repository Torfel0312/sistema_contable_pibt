"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createMovementSchema } from "@/lib/validators/movement"
import type { CreateMovementInput } from "@/lib/validators/movement"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { NativeSelect } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AttachmentInput } from "@/components/ui/attachment-input"
import { useAttachmentUpload } from "@/hooks/use-attachment-upload"
import { MAX_ATTACHMENTS_PER_ENTITY } from "@/lib/constants/attachments"
import { createMovement, updateMovement, removeMovementAttachment } from "@/app/actions/movements"
import { FileText, ImageIcon, X } from "lucide-react"

type ExistingAttachment = {
  id: string
  file_name: string
  mime_type: string
  drive_view_link: string
}

type EditMovement = {
  id: string
  movement_date: string
  movement_type: string
  amount: number | string
  category_id: string
  subcategory_id?: string | null
  delivered_by?: string | null
  receipt_email?: string | null
  payment_method_id?: string | null
  notes?: string | null
  movement_attachments?: ExistingAttachment[]
}

type PaymentMethodOption = { id: string; name: string; is_active: boolean }
type CategoryOption = {
  id: string
  movement_type: "INCOME" | "EXPENSE"
  name: string
  is_active: boolean
  is_system: boolean
}
type SubcategoryOption = { id: string; category_id: string; name: string; is_active: boolean }

type Props = (
  | { mode: "create"; onSuccess?: () => void }
  | { mode: "edit"; movement: EditMovement; onSuccess?: () => void }
) & {
  paymentMethods: PaymentMethodOption[]
  categories: CategoryOption[]
  subcategories: SubcategoryOption[]
  defaultValues?: Partial<CreateMovementInput>
  /** Capital injection is always an income with no external counterparty — hides
   * the type/delivered-by/receipt-email fields instead of just prefilling them. */
  isCapitalInjection?: boolean
}

function toDateValue(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10)
  return value.slice(0, 10)
}

export function MovementForm(props: Props) {
  const { mode, onSuccess, paymentMethods, categories, subcategories, defaultValues, isCapitalInjection } =
    props
  const movement = mode === "edit" ? props.movement : undefined
  const movementId = movement?.id

  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(
    movement?.movement_attachments ?? []
  )
  const attachmentUpload = useAttachmentUpload(existingAttachments.length)
  const totalAttachments = existingAttachments.length + attachmentUpload.items.length
  const attachmentsAtCap = totalAttachments >= MAX_ATTACHMENTS_PER_ENTITY

  const form = useForm<MovementFormInput, unknown, CreateMovementInput>({
    resolver: zodResolver(createMovementSchema),
    defaultValues: {
      movement_date: toDateValue(movement?.movement_date),
      movement_type:
        (movement?.movement_type as "INCOME" | "EXPENSE") ??
        defaultValues?.movement_type ??
        "INCOME",
      amount: movement ? Number(movement.amount) : ("" as unknown as number),
      category_id: movement?.category_id ?? defaultValues?.category_id ?? "",
      // undefined (not ""), unlike category_id: subcategory is optional and its
      // <select> only mounts when the chosen category actually has subcategories
      // (see subcategoryOptions below) — an unregistered "" default would still
      // get submitted as-is and fail the uuid().optional().nullable() validator,
      // with no visible error since the field never renders in that case.
      subcategory_id: movement?.subcategory_id ?? defaultValues?.subcategory_id ?? undefined,
      delivered_by: movement?.delivered_by ?? "",
      receipt_email: movement?.receipt_email ?? "",
      payment_method_id: movement?.payment_method_id ?? "",
      notes: movement?.notes ?? ""
    }
  })

  const movementType = useWatch({ control: form.control, name: "movement_type" })
  const currentCategoryId = useWatch({ control: form.control, name: "category_id" })
  const currentSubcategoryId = useWatch({ control: form.control, name: "subcategory_id" })
  const currentPaymentMethodId = useWatch({ control: form.control, name: "payment_method_id" })
  const categoryOptions = useMemo(() => {
    const active = categories.filter((c) => c.movement_type === movementType && c.is_active)
    // The current value may not be in the active list — e.g. an existing movement
    // (edit mode) was created with a category later archived. Surface it as a
    // selectable option so the select never silently falls back to blank/mismatched.
    if (currentCategoryId && !active.some((c) => c.id === currentCategoryId)) {
      const current = categories.find((c) => c.id === currentCategoryId)
      if (current) return [current, ...active]
    }
    return active
  }, [categories, movementType, currentCategoryId])
  const subcategoryOptions = useMemo(() => {
    const active = subcategories.filter((s) => s.category_id === currentCategoryId && s.is_active)
    // Same guard: an existing movement (edit mode) may point to a subcategory
    // that's since been archived — inject it so the select keeps showing/saving it.
    if (currentSubcategoryId && !active.some((s) => s.id === currentSubcategoryId)) {
      const current = subcategories.find((s) => s.id === currentSubcategoryId)
      if (current) return [current, ...active]
    }
    return active
  }, [subcategories, currentCategoryId, currentSubcategoryId])
  const deliveredByLabel = movementType === "INCOME" ? "Entregado por" : "Entregado a"
  const paymentMethodOptions = useMemo(() => {
    const active = paymentMethods.filter((pm) => pm.is_active)
    // Same guard as categories: an existing movement (edit mode) may point to a
    // payment method that's since been archived (is_active: false) and filtered out
    // of the active list — inject it so the select keeps showing/saving the real value.
    if (currentPaymentMethodId && !active.some((pm) => pm.id === currentPaymentMethodId)) {
      const current = paymentMethods.find((pm) => pm.id === currentPaymentMethodId)
      if (current) return [current, ...active]
    }
    return active
  }, [paymentMethods, currentPaymentMethodId])

  // Switching movement type invalidates the selected category (categories are
  // scoped per type) — reset it so a stale INCOME category can't be submitted
  // alongside movement_type: EXPENSE (the FK doesn't enforce that match).
  useEffect(() => {
    const stillValid = categories.some(
      (c) => c.id === currentCategoryId && c.movement_type === movementType
    )
    if (currentCategoryId && !stillValid) {
      form.setValue("category_id", "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementType])

  // A subcategory belongs to a specific category — if the selected category
  // changes (either the user picking a new one, or the movement_type switch
  // above clearing it out of range), any previously-selected subcategory no
  // longer applies and must be cleared rather than silently lingering.
  // undefined (not ""), same reasoning as the defaultValues comment above —
  // the field may not be registered if the new category has no subcategories.
  useEffect(() => {
    const stillValid = subcategories.some(
      (s) => s.id === currentSubcategoryId && s.category_id === currentCategoryId
    )
    if (currentSubcategoryId && !stillValid) {
      form.setValue("subcategory_id", undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategoryId])

  async function handleRemoveExisting(attachmentId: string) {
    try {
      await removeMovementAttachment(attachmentId)
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el adjunto.")
    }
  }

  async function onSubmit(values: CreateMovementInput) {
    setError(null)

    const attachments = attachmentUpload.items.map((item) => ({
      driveFileId: item.driveFileId,
      driveViewLink: item.driveViewLink,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes
    }))

    try {
      if (mode === "create") {
        const created = await createMovement({ ...values, attachments })
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/movements/${created.id}`)
        }
      } else {
        await updateMovement(movementId!, { ...values, attachments })
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/movements/${movementId}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el movimiento.")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 px-1">
          <div className="h-px flex-1 bg-border" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Datos del Movimiento
          </h3>
          <div className="h-px flex-1 bg-border" />
        </div>

        <FieldGroup>
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {!isCapitalInjection && (
              <Field>
                <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Tipo de Operación
                </FieldLabel>
                <NativeSelect className="w-full" size="lg" {...form.register("movement_type")}>
                  <option value="INCOME">Ingreso (Entrada)</option>
                  <option value="EXPENSE">Egreso (Gasto)</option>
                </NativeSelect>
              </Field>
            )}

            {!isCapitalInjection && (
              <Field>
                <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  {deliveredByLabel}
                </FieldLabel>
                <Input
                  className="h-12 sm:h-14"
                  placeholder="Opcional"
                  {...form.register("delivered_by")}
                />
              </Field>
            )}

            {!isCapitalInjection && (
              <Field data-invalid={!!form.formState.errors.receipt_email || undefined}>
                <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Email de comprobante
                </FieldLabel>
                <Input
                  type="email"
                  className="h-12 sm:h-14"
                  placeholder="correo@ejemplo.com"
                  aria-invalid={!!form.formState.errors.receipt_email}
                  {...form.register("receipt_email")}
                />
                <FieldError errors={[form.formState.errors.receipt_email]} />
              </Field>
            )}

            <Field data-invalid={!!form.formState.errors.movement_date || undefined}>
              <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Fecha de Registro
              </FieldLabel>
              <Controller
                name="movement_date"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(`${field.value}T12:00:00Z`) : undefined}
                    onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    className="h-12 sm:h-14"
                  />
                )}
              />
              <FieldError errors={[form.formState.errors.movement_date]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.amount || undefined}>
              <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Monto (CLP)
              </FieldLabel>
              <Controller
                name="amount"
                control={form.control}
                render={({ field }) => (
                  <CurrencyInput
                    className="h-12 sm:h-14 text-lg font-bold"
                    placeholder="0"
                    aria-invalid={!!form.formState.errors.amount}
                    value={field.value as number | string | undefined}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>

            <Field>
              <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Medio de Pago
              </FieldLabel>
              <NativeSelect
                className="w-full"
                size="lg"
                {...form.register("payment_method_id", {
                  setValueAs: (value: string) => (value === "" ? undefined : value)
                })}
              >
                <option value="">Sin especificar</option>
                {paymentMethodOptions.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field data-invalid={!!form.formState.errors.category_id || undefined}>
              <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Categoría
              </FieldLabel>
              <NativeSelect
                className="w-full"
                size="lg"
                aria-invalid={!!form.formState.errors.category_id}
                {...form.register("category_id")}
              >
                <option value="">Seleccione Categoría</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={[form.formState.errors.category_id]} />
            </Field>

            {subcategoryOptions.length > 0 && (
              <Field>
                <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Subcategoría
                </FieldLabel>
                <NativeSelect
                  className="w-full"
                  size="lg"
                  {...form.register("subcategory_id", {
                    setValueAs: (value: string) => (value === "" ? undefined : value)
                  })}
                >
                  <option value="">Sin subcategoría</option>
                  {subcategoryOptions.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>

          <Field>
            <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Comentarios / Observaciones
            </FieldLabel>
            <textarea
              className="flex min-h-[100px] sm:min-h-[120px] w-full rounded-lg border border-border bg-background px-4 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              placeholder="Algún detalle adicional relevante..."
              {...form.register("notes")}
            />
          </Field>

          {existingAttachments.length > 0 && (
            <Field>
              <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Adjuntos existentes
              </FieldLabel>
              <div className="flex flex-col gap-2">
                {existingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                      {att.mime_type.startsWith("image/") ? (
                        <ImageIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <FileText className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <a
                      href={att.drive_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs font-bold text-primary hover:underline"
                    >
                      {att.file_name}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => handleRemoveExisting(att.id)}
                      aria-label={`Eliminar ${att.file_name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Field>
          )}

          <Field>
            <FieldLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Comprobantes (foto o archivo)
            </FieldLabel>
            <AttachmentInput
              items={attachmentUpload.items}
              isUploading={attachmentUpload.isUploading}
              disabled={attachmentsAtCap}
              maxReachedMessage={`Alcanzaste el máximo de ${MAX_ATTACHMENTS_PER_ENTITY} adjuntos para este movimiento`}
              onAddFiles={attachmentUpload.addFiles}
              onRemove={attachmentUpload.remove}
            />
            {attachmentUpload.error && (
              <p className="text-sm font-normal text-destructive">{attachmentUpload.error}</p>
            )}
          </Field>
        </FieldGroup>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || attachmentUpload.isUploading}
          className="h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base flex-1 sm:flex-none"
        >
          {form.formState.isSubmitting
            ? "Procesando..."
            : mode === "create"
              ? "Confirmar y Guardar"
              : "Actualizar Información"}
        </Button>
        {onSuccess && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess?.()}
            className="h-10 sm:h-11 flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

type MovementFormInput = z.input<typeof createMovementSchema>
