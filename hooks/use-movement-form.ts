"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createMovementSchema } from "@/lib/validators/movement"
import type { CreateMovementInput } from "@/lib/validators/movement"
import { useAttachmentUpload } from "@/hooks/use-attachment-upload"
import { MAX_ATTACHMENTS_PER_ENTITY } from "@/lib/constants/attachments"
import { createMovement, updateMovement, removeMovementAttachment } from "@/app/actions/movements"

export type ExistingAttachment = {
  id: string
  file_name: string
  mime_type: string
  drive_view_link: string
}

export type EditMovement = {
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
  notify_by_email?: boolean
  movement_attachments?: ExistingAttachment[]
}

export type PaymentMethodOption = { id: string; name: string; is_active: boolean }
export type CategoryOption = {
  id: string
  movement_type: "INCOME" | "EXPENSE"
  name: string
  is_active: boolean
  is_system: boolean
}
export type SubcategoryOption = { id: string; category_id: string; name: string; is_active: boolean }

export type MovementFormInput = z.input<typeof createMovementSchema>

export type UseMovementFormProps = (
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

export function useMovementForm(props: UseMovementFormProps) {
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
      notes: movement?.notes ?? "",
      // Edit mode respects whatever was already stored; create mode gets a
      // sensible default here and then re-synced below as the user picks a
      // type, since movement_type isn't known yet at this first render.
      notify_by_email:
        movement?.notify_by_email ??
        (movement?.movement_type ?? defaultValues?.movement_type ?? "INCOME") === "INCOME"
    }
  })

  const movementType = useWatch({ control: form.control, name: "movement_type" })
  const currentCategoryId = useWatch({ control: form.control, name: "category_id" })
  const currentSubcategoryId = useWatch({ control: form.control, name: "subcategory_id" })
  const currentPaymentMethodId = useWatch({ control: form.control, name: "payment_method_id" })
  const watchedAmount = useWatch({ control: form.control, name: "amount" })
  // Capital injection is a single-page form (no wizard steps to gate progress),
  // so — per the design spec — the save button itself stays disabled until an
  // amount is entered rather than only validating on submit.
  const isSaveDisabled = isCapitalInjection && (!watchedAmount || Number(watchedAmount) <= 0)
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

  // Only in create mode: keep the "notify by email" default in sync with the
  // chosen type (checked for INCOME, unchecked for EXPENSE) as the user moves
  // through the wizard, but stop touching it the moment they manually toggle
  // it themselves. Edit mode never runs this — it respects the stored value
  // and lets the user change it with no type-driven magic.
  useEffect(() => {
    if (mode !== "create") return
    if (form.formState.dirtyFields.notify_by_email) return
    form.setValue("notify_by_email", movementType === "INCOME")
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

  return {
    mode,
    isCapitalInjection,
    form,
    error,
    setError,
    existingAttachments,
    attachmentUpload,
    attachmentsAtCap,
    isSaveDisabled,
    categoryOptions,
    subcategoryOptions,
    paymentMethodOptions,
    deliveredByLabel,
    handleRemoveExisting,
    onSubmit
  }
}

export type MovementFormState = ReturnType<typeof useMovementForm>
