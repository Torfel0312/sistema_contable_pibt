"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
  Banknote,
  FileText,
  Plus,
  Undo2,
  Ban,
  Eye,
  Lock,
  Archive,
  Paperclip,
  X
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { IntentionProgress } from "@/components/intentions/intention-progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { DatePicker } from "@/components/ui/date-picker"
import { AttachmentInput } from "@/components/ui/attachment-input"
import { useAttachmentUpload } from "@/hooks/use-attachment-upload"
import { formatDate, formatDateTime, formatCLP } from "@/lib/utils"
import {
  reviewIntentionSchema,
  registerTransferSchema,
  addCommentSchema
} from "@/lib/validators/intention"
import { createSettlementSchema, reviewSettlementSchema } from "@/lib/validators/settlement"
import type {
  ReviewIntentionInput,
  RegisterTransferInput,
  AddCommentInput
} from "@/lib/validators/intention"
import type { CreateSettlementInput, ReviewSettlementInput } from "@/lib/validators/settlement"
import type { intentionsService } from "@/services/intentions/intentions.service"
import type { settlementsService } from "@/services/settlements/settlements.service"
import { reviewRequest, registerTransfer, addComment } from "@/app/actions/requests"
import {
  createMinistrySettlement,
  submitSettlement,
  cancelSettlement,
  startReviewSettlement,
  reviewMinistrySettlement,
  removeSettlementAttachment,
  closeIntentionSettlements
} from "@/app/actions/ministry-settlements"

type Intention = Awaited<ReturnType<typeof intentionsService.getById>>
type Transfer = Awaited<ReturnType<typeof intentionsService.getTransfer>>
type Comment = Awaited<ReturnType<typeof intentionsService.getComments>>[number]
type Settlement = Awaited<ReturnType<typeof settlementsService.list>>[number]
type SettlementComment = Awaited<ReturnType<typeof settlementsService.getCommentsBySettlementIds>>[number]

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: "text-amber-500", label: "Pendiente de revisión" },
  APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Aprobada" },
  REJECTED: { icon: XCircle, color: "text-red-500", label: "Rechazada" }
}

const SETTLEMENT_STATUS_CONFIG = {
  DRAFT: { color: "text-muted-foreground", label: "Borrador" },
  PENDING: { color: "text-amber-500", label: "Pendiente de revisión" },
  IN_REVIEW: { color: "text-blue-500", label: "En revisión" },
  APPROVED: { color: "text-green-600", label: "Aprobada" },
  REJECTED: { color: "text-red-500", label: "Rechazada" },
  RETURNED_FOR_CORRECTION: { color: "text-orange-500", label: "Devuelta para corrección" },
  CANCELLED: { color: "text-muted-foreground line-through", label: "Cancelada" }
} as const

const CANCELLABLE_SETTLEMENT_STATUSES = new Set(["DRAFT", "PENDING", "RETURNED_FOR_CORRECTION"])
const RESUBMITTABLE_SETTLEMENT_STATUSES = new Set(["DRAFT", "RETURNED_FOR_CORRECTION"])
const TERMINAL_SETTLEMENT_STATUSES = new Set(["APPROVED", "CANCELLED"])

export function IntentionDetailClient({
  intention,
  comments: initialComments,
  transfer,
  settlements: initialSettlements,
  settlementComments,
  canReview,
  canSubmit,
  currentUserId
}: {
  intention: Intention
  comments: Comment[]
  transfer: Transfer
  settlements: Settlement[]
  settlementComments: SettlementComment[]
  canReview: boolean
  canSubmit: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements)
  const [currentTransfer, setCurrentTransfer] = useState<Transfer>(transfer)
  const status = STATUS_CONFIG[intention.status]
  const StatusIcon = status.icon
  const isMinister = canSubmit
  const isClosed = !!intention.settlement_closed_at

  const commentsBySettlement = settlementComments.reduce<Record<string, SettlementComment[]>>(
    (acc, c) => {
      ;(acc[c.entity_id] ??= []).push(c)
      return acc
    },
    {}
  )

  function updateSettlement(updated: { id: string } & Partial<Settlement>) {
    setSettlements((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    )
  }

  const [reviewOpen, setReviewOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [settlementOpen, setSettlementOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [settlementReviewOpenId, setSettlementReviewOpenId] = useState<string | null>(null)
  const attachmentUpload = useAttachmentUpload()
  const settlementAttachmentUpload = useAttachmentUpload()
  const closeAttachmentUpload = useAttachmentUpload()

  const reviewForm = useForm<ReviewIntentionInput>({
    resolver: zodResolver(reviewIntentionSchema),
    defaultValues: { action: "APPROVED", message: "" }
  })

  type TransferFormValues = Omit<RegisterTransferInput, "amount"> & { amount: string }
  const transferForm = useForm<TransferFormValues, unknown, RegisterTransferInput>({
    resolver: zodResolver(registerTransferSchema) as Resolver<
      TransferFormValues,
      unknown,
      RegisterTransferInput
    >,
    defaultValues: {
      amount: String(intention.amount),
      transfer_date: "",
      reference: "",
      notes: ""
    }
  })

  const commentForm = useForm<AddCommentInput>({
    resolver: zodResolver(addCommentSchema),
    defaultValues: { message: "" }
  })

  type SettlementFormValues = Omit<CreateSettlementInput, "amount"> & { amount: string }
  const settlementForm = useForm<SettlementFormValues, unknown, CreateSettlementInput>({
    resolver: zodResolver(createSettlementSchema) as Resolver<
      SettlementFormValues,
      unknown,
      CreateSettlementInput
    >,
    defaultValues: {
      intention_id: intention.id,
      amount: "",
      description: "",
      expense_date: "",
      attachments: [],
      isDraft: false
    }
  })

  const settlementReviewForm = useForm<ReviewSettlementInput>({
    resolver: zodResolver(reviewSettlementSchema),
    defaultValues: { action: "APPROVED", message: "" }
  })
  // eslint-disable-next-line react-hooks/incompatible-library
  const settlementReviewAction = settlementReviewForm.watch("action")

  const settlDate = settlementForm.watch("expense_date")
  const lateExpiry = settlDate
    ? Math.floor((Date.now() - new Date(settlDate).getTime()) / 86_400_000) > 30
    : false

  async function handleReview(values: ReviewIntentionInput) {
    try {
      const result = await reviewRequest(intention.id, values)
      if (result.alreadyActioned) {
        toast.info("Esta solicitud ya fue revisada")
        setReviewOpen(false)
        return
      }
      toast.success(values.action === "APPROVED" ? "Solicitud aprobada" : "Solicitud rechazada")
      setReviewOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al revisar")
    }
  }

  async function handleRegisterTransfer(values: RegisterTransferInput) {
    try {
      const attachments = attachmentUpload.items.map((item) => ({
        driveFileId: item.driveFileId,
        driveViewLink: item.driveViewLink,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
      }))
      const transferData = await registerTransfer(intention.id, {
        ...values,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
        attachments
      })
      setCurrentTransfer(transferData as unknown as Transfer)
      setTransferOpen(false)
      toast.success("Transferencia registrada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar")
    }
  }

  async function handleAddComment(values: AddCommentInput) {
    try {
      const commentData = await addComment(intention.id, values)
      setComments((prev) => [...prev, commentData as unknown as Comment])
      commentForm.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al comentar")
    }
  }

  async function handleSubmitSettlement(values: CreateSettlementInput) {
    try {
      const attachments = settlementAttachmentUpload.items.map((item) => ({
        driveFileId: item.driveFileId,
        driveViewLink: item.driveViewLink,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
      }))
      const settlData = await createMinistrySettlement({ ...values, attachments })
      setSettlements((prev) => [...prev, settlData as unknown as Settlement])
      setSettlementOpen(false)
      settlementForm.reset({
        intention_id: intention.id,
        amount: "",
        description: "",
        expense_date: "",
        attachments: [],
        isDraft: false
      })
      toast.success(values.isDraft ? "Borrador guardado" : "Rendición enviada para revisión")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar rendición")
    }
  }

  async function handleSubmitSettlementForReview(id: string) {
    try {
      const result = await submitSettlement(id, intention.id)
      if (result.alreadyActioned) {
        toast.info("Esta rendición ya no está en un estado editable")
        router.refresh()
        return
      }
      updateSettlement(result.data as unknown as Settlement)
      toast.success("Rendición enviada a revisión")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar la rendición")
    }
  }

  async function handleCancelSettlement(id: string) {
    try {
      const data = await cancelSettlement(id, intention.id)
      updateSettlement(data as unknown as Settlement)
      toast.success("Rendición cancelada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar la rendición")
    }
  }

  async function handleStartReviewSettlement(id: string) {
    try {
      const result = await startReviewSettlement(id, intention.id)
      if (result.alreadyActioned) {
        toast.info("Esta rendición ya no está pendiente")
        router.refresh()
        return
      }
      updateSettlement(result.data as unknown as Settlement)
      toast.success("Rendición tomada para revisión")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al tomar la rendición")
    }
  }

  async function handleReviewSettlement(values: ReviewSettlementInput) {
    if (!settlementReviewOpenId) return
    try {
      const result = await reviewMinistrySettlement(settlementReviewOpenId, intention.id, values)
      if (result.alreadyActioned) {
        toast.info("Esta rendición ya fue revisada")
        setSettlementReviewOpenId(null)
        router.refresh()
        return
      }
      updateSettlement(result.data as unknown as Settlement)
      const labels = {
        APPROVED: "Rendición aprobada",
        REJECTED: "Rendición rechazada",
        RETURNED_FOR_CORRECTION: "Rendición devuelta para corrección"
      }
      toast.success(labels[values.action])
      setSettlementReviewOpenId(null)
      settlementReviewForm.reset()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al revisar la rendición")
    }
  }

  async function handleRemoveSettlementAttachment(attachmentId: string, settlementId: string) {
    try {
      await removeSettlementAttachment(attachmentId, intention.id)
      setSettlements((prev) =>
        prev.map((s) =>
          s.id === settlementId
            ? {
                ...s,
                settlement_attachments: s.settlement_attachments?.filter(
                  (a) => a.id !== attachmentId
                )
              }
            : s
        )
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el adjunto")
    }
  }

  async function handleCloseIntention() {
    if (!closeAttachmentUpload.items.length) {
      toast.error("Adjunta al menos un comprobante de la transferencia de devolución")
      return
    }
    try {
      const attachments = closeAttachmentUpload.items.map((item) => ({
        driveFileId: item.driveFileId,
        driveViewLink: item.driveViewLink,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
      }))
      await closeIntentionSettlements({ intention_id: intention.id, attachments })
      setCloseOpen(false)
      toast.success("Solicitud cerrada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar la solicitud")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Volver
      </Button>

      <IntentionProgress
        status={intention.status}
        fundingMethod={intention.funding_method}
        hasTransfer={!!currentTransfer}
        hasSettlement={settlements.some((s) => s.status !== "DRAFT" && s.status !== "CANCELLED")}
        hasApprovedSettlement={settlements.some((s) => s.status === "APPROVED")}
        isClosed={isClosed}
      />

      {/* Header */}
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon className={`size-5 ${status.color}`} />
              <span className="font-semibold">{status.label}</span>
            </div>
            <p className="text-2xl font-bold">{formatCLP(intention.amount)}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{intention.ministries?.name}</p>
            <p>{formatDate(intention.created_at)}</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Propósito: </span>
            {intention.purpose}
          </div>
          <div>
            <span className="text-muted-foreground">Método de financiamiento: </span>
            {intention.funding_method === "TRANSFER" ? "Transferencia anticipada" : "Reembolso"}
          </div>
          {intention.date_needed && (
            <div>
              <span className="text-muted-foreground">Fecha requerida: </span>
              {formatDate(intention.date_needed)}
            </div>
          )}
          {intention.users && (
            <div>
              <span className="text-muted-foreground">Solicitado por: </span>
              {intention.users.full_name}
            </div>
          )}
        </div>

        {intention.review_message && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="font-medium">Mensaje del revisor: </span>
            {intention.review_message}
          </div>
        )}

        {/* Actions for tesorería */}
        {canReview && intention.status === "PENDING" && (
          <div className="flex gap-2 pt-1">
            <Dialog
              open={reviewOpen}
              onOpenChange={(o) => {
                setReviewOpen(o)
                if (!o) reviewForm.reset()
              }}
            >
              <DialogTrigger
                onClick={() => reviewForm.setValue("action", "APPROVED")}
                render={
                  <Button size="sm">
                    <CheckCircle className="size-4" />
                    Aprobar
                  </Button>
                }
              />
              <DialogTrigger
                onClick={() => reviewForm.setValue("action", "REJECTED")}
                render={
                  <Button size="sm" variant="outline">
                    <XCircle className="size-4" />
                    Rechazar
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {reviewForm.watch("action") === "APPROVED"
                      ? "Aprobar solicitud"
                      : "Rechazar solicitud"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={reviewForm.handleSubmit(handleReview)} className="space-y-4 pt-2">
                  <Field>
                    <FieldLabel htmlFor="review-msg">Mensaje *</FieldLabel>
                    <Input
                      id="review-msg"
                      placeholder="Escribe un mensaje para el ministro"
                      {...reviewForm.register("message")}
                    />
                    <FieldError errors={[reviewForm.formState.errors.message]} />
                  </Field>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={reviewForm.formState.isSubmitting}
                    variant={reviewForm.watch("action") === "APPROVED" ? "default" : "destructive"}
                  >
                    {reviewForm.formState.isSubmitting
                      ? "Procesando..."
                      : reviewForm.watch("action") === "APPROVED"
                        ? "Confirmar aprobación"
                        : "Confirmar rechazo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Card>

      {/* Transfer section */}
      {intention.status === "APPROVED" && intention.funding_method === "TRANSFER" && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Banknote className="size-4" />
              Transferencia
            </h2>
            {canReview && !currentTransfer && (
              <Dialog
                open={transferOpen}
                onOpenChange={(o) => {
                  setTransferOpen(o)
                  if (!o) transferForm.reset()
                }}
              >
                <DialogTrigger render={<Button size="sm">Registrar transferencia</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar transferencia</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={transferForm.handleSubmit(handleRegisterTransfer)}
                    className="space-y-4 pt-2"
                  >
                    <Field>
                      <FieldLabel>Monto (CLP) *</FieldLabel>
                      <Controller
                        control={transferForm.control}
                        name="amount"
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value}
                            onChange={(value) =>
                              field.onChange(value === undefined ? "" : String(value))
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                      <FieldError errors={[transferForm.formState.errors.amount]} />
                    </Field>
                    <Field>
                      <FieldLabel>Fecha de transferencia *</FieldLabel>
                      <Controller
                        control={transferForm.control}
                        name="transfer_date"
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
                      <FieldError errors={[transferForm.formState.errors.transfer_date]} />
                    </Field>
                    <Field>
                      <FieldLabel>Referencia</FieldLabel>
                      <Input
                        placeholder="N° de comprobante o referencia bancaria"
                        {...transferForm.register("reference")}
                      />
                      <FieldError errors={[transferForm.formState.errors.reference]} />
                    </Field>
                    <Field>
                      <FieldLabel>Notas</FieldLabel>
                      <Input
                        placeholder="Observaciones opcionales"
                        {...transferForm.register("notes")}
                      />
                      <FieldError errors={[transferForm.formState.errors.notes]} />
                    </Field>
                    <Field>
                      <FieldLabel>Comprobante de transferencia</FieldLabel>
                      <AttachmentInput
                        items={attachmentUpload.items}
                        isUploading={attachmentUpload.isUploading}
                        onAddFiles={attachmentUpload.addFiles}
                        onRemove={attachmentUpload.remove}
                      />
                      {attachmentUpload.error && (
                        <p className="text-sm font-normal text-destructive">
                          {attachmentUpload.error}
                        </p>
                      )}
                    </Field>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={transferForm.formState.isSubmitting}
                    >
                      {transferForm.formState.isSubmitting ? "Registrando..." : "Registrar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {currentTransfer ? (
            <div className="grid gap-1.5 text-sm bg-green-50 dark:bg-green-900/20 rounded-md p-3">
              <div>
                <span className="text-muted-foreground">Monto: </span>
                {formatCLP(currentTransfer.amount)}
              </div>
              <div>
                <span className="text-muted-foreground">Fecha: </span>
                {formatDate(currentTransfer.transfer_date)}
              </div>
              {currentTransfer.reference && (
                <div>
                  <span className="text-muted-foreground">Referencia: </span>
                  {currentTransfer.reference}
                </div>
              )}
              {currentTransfer.notes && (
                <div>
                  <span className="text-muted-foreground">Notas: </span>
                  {currentTransfer.notes}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              Transferencia pendiente de registro
            </p>
          )}
        </Card>
      )}

      {/* Settlement section */}
      {intention.status === "APPROVED" &&
        (intention.funding_method === "REIMBURSEMENT" || currentTransfer) && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="size-4" />
              Rendición de gastos
            </h2>
            {isMinister && (
              <Dialog
                open={settlementOpen}
                onOpenChange={(o) => {
                  setSettlementOpen(o)
                  if (!o)
                    settlementForm.reset({
                      intention_id: intention.id,
                      amount: "",
                      description: "",
                      expense_date: ""
                    })
                }}
              >
                <DialogTrigger
                  render={
                    <Button size="sm">
                      <Plus className="size-4" />
                      Nueva rendición
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rendición de gastos</DialogTitle>
                  </DialogHeader>
                  {lateExpiry && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      <AlertTriangle className="size-4 shrink-0" />
                      La fecha del gasto supera los 30 días. Esta rendición podría ser rechazada por
                      el equipo de tesorería.
                    </div>
                  )}
                  <form className="space-y-4">
                    <Field>
                      <FieldLabel>Monto del gasto (CLP) *</FieldLabel>
                      <Controller
                        control={settlementForm.control}
                        name="amount"
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value}
                            onChange={(value) =>
                              field.onChange(value === undefined ? "" : String(value))
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                      <FieldError errors={[settlementForm.formState.errors.amount]} />
                    </Field>
                    <Field>
                      <FieldLabel>Descripción *</FieldLabel>
                      <Input
                        placeholder="Detalle del gasto realizado"
                        {...settlementForm.register("description")}
                      />
                      <FieldError errors={[settlementForm.formState.errors.description]} />
                    </Field>
                    <Field>
                      <FieldLabel>Fecha del gasto *</FieldLabel>
                      <Controller
                        control={settlementForm.control}
                        name="expense_date"
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
                      <FieldError errors={[settlementForm.formState.errors.expense_date]} />
                    </Field>
                    <Field>
                      <FieldLabel>Comprobantes</FieldLabel>
                      <AttachmentInput
                        items={settlementAttachmentUpload.items}
                        isUploading={settlementAttachmentUpload.isUploading}
                        onAddFiles={settlementAttachmentUpload.addFiles}
                        onRemove={settlementAttachmentUpload.remove}
                      />
                      {settlementAttachmentUpload.error && (
                        <p className="text-sm font-normal text-destructive">
                          {settlementAttachmentUpload.error}
                        </p>
                      )}
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={settlementForm.formState.isSubmitting}
                        onClick={settlementForm.handleSubmit((values) =>
                          handleSubmitSettlement({ ...values, isDraft: true })
                        )}
                      >
                        Guardar borrador
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={settlementForm.formState.isSubmitting}
                        onClick={settlementForm.handleSubmit((values) =>
                          handleSubmitSettlement({ ...values, isDraft: false })
                        )}
                      >
                        {settlementForm.formState.isSubmitting ? "Enviando..." : "Enviar a revisión"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin rendiciones aún.</p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s) => {
                const statusConfig = SETTLEMENT_STATUS_CONFIG[s.status]
                const isOwner = s.submitted_by === currentUserId
                const settlementThread = commentsBySettlement[s.id] ?? []
                return (
                  <div key={s.id} className="rounded-md border p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatCLP(s.amount)}</span>
                      <span className={`text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{s.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Gasto: {formatDate(s.expense_date)}
                    </p>
                    {s.is_late && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        Gasto tardío (+30 días)
                      </p>
                    )}
                    {(s.settlement_attachments?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.settlement_attachments!.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-1 text-xs"
                          >
                            <Paperclip className="size-3" />
                            <a
                              href={a.drive_view_link}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {a.file_name}
                            </a>
                            {isOwner && CANCELLABLE_SETTLEMENT_STATUSES.has(s.status) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSettlementAttachment(a.id, s.id)}
                                aria-label="Eliminar adjunto"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.review_message && (
                      <p className="text-xs bg-muted/50 rounded px-2 py-1">
                        <span className="font-medium">Revisor: </span>
                        {s.review_message}
                      </p>
                    )}
                    {settlementThread.length > 0 && (
                      <div className="space-y-1 border-l-2 border-orange-300 pl-2">
                        {settlementThread.map((c) => (
                          <div key={c.id} className="text-xs">
                            <span className="font-medium">{c.users?.full_name ?? "Tesorería"}: </span>
                            <span className="text-muted-foreground">{c.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isOwner && RESUBMITTABLE_SETTLEMENT_STATUSES.has(s.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSubmitSettlementForReview(s.id)}
                        >
                          {s.status === "RETURNED_FOR_CORRECTION" ? "Reenviar" : "Enviar a revisión"}
                        </Button>
                      )}
                      {isOwner && CANCELLABLE_SETTLEMENT_STATUSES.has(s.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelSettlement(s.id)}
                        >
                          <Ban className="size-4" />
                          Cancelar
                        </Button>
                      )}
                      {canReview && s.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartReviewSettlement(s.id)}
                        >
                          <Eye className="size-4" />
                          Tomar para revisión
                        </Button>
                      )}
                      {canReview && s.status === "IN_REVIEW" && (
                        <Dialog
                          open={settlementReviewOpenId === s.id}
                          onOpenChange={(o) => {
                            setSettlementReviewOpenId(o ? s.id : null)
                            if (!o) settlementReviewForm.reset()
                          }}
                        >
                          <DialogTrigger
                            onClick={() => settlementReviewForm.setValue("action", "APPROVED")}
                            render={
                              <Button size="sm">
                                <CheckCircle className="size-4" />
                                Aprobar
                              </Button>
                            }
                          />
                          <DialogTrigger
                            onClick={() => settlementReviewForm.setValue("action", "REJECTED")}
                            render={
                              <Button size="sm" variant="outline">
                                <XCircle className="size-4" />
                                Rechazar
                              </Button>
                            }
                          />
                          <DialogTrigger
                            onClick={() =>
                              settlementReviewForm.setValue("action", "RETURNED_FOR_CORRECTION")
                            }
                            render={
                              <Button size="sm" variant="outline">
                                <Undo2 className="size-4" />
                                Devolver
                              </Button>
                            }
                          />
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {settlementReviewAction === "APPROVED"
                                  ? "Aprobar rendición"
                                  : settlementReviewAction === "REJECTED"
                                    ? "Rechazar rendición"
                                    : "Devolver para corrección"}
                              </DialogTitle>
                            </DialogHeader>
                            <form
                              onSubmit={settlementReviewForm.handleSubmit(handleReviewSettlement)}
                              className="space-y-4 pt-2"
                            >
                              <Field>
                                <FieldLabel>Mensaje *</FieldLabel>
                                <Input
                                  placeholder="Escribe un mensaje para el ministro"
                                  {...settlementReviewForm.register("message")}
                                />
                                <FieldError errors={[settlementReviewForm.formState.errors.message]} />
                              </Field>
                              <Button
                                type="submit"
                                className="w-full"
                                disabled={settlementReviewForm.formState.isSubmitting}
                                variant={settlementReviewAction === "REJECTED" ? "destructive" : "default"}
                              >
                                {settlementReviewForm.formState.isSubmitting
                                  ? "Procesando..."
                                  : "Confirmar"}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                      {s.status === "IN_REVIEW" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="size-3" />
                          En revisión, no editable
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Close-out section */}
      {canReview &&
        intention.status === "APPROVED" &&
        settlements.length > 0 &&
        settlements.every((s) => TERMINAL_SETTLEMENT_STATUSES.has(s.status)) &&
        settlements.some((s) => s.status === "APPROVED") && (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Archive className="size-4" />
            Cierre de solicitud
          </h2>
          {isClosed ? (
            <div className="space-y-2">
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle className="size-4" />
                Solicitud cerrada
              </p>
              {(intention.intention_attachments?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {intention.intention_attachments!.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-1 text-xs"
                    >
                      <Paperclip className="size-3" />
                      <a href={a.drive_view_link} target="_blank" rel="noreferrer" className="underline">
                        {a.file_name}
                      </a>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Dialog
              open={closeOpen}
              onOpenChange={(o) => {
                setCloseOpen(o)
              }}
            >
              <DialogTrigger render={<Button size="sm">Cerrar solicitud</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cerrar solicitud</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Field>
                    <FieldLabel>Comprobante de la transferencia de devolución *</FieldLabel>
                    <AttachmentInput
                      items={closeAttachmentUpload.items}
                      isUploading={closeAttachmentUpload.isUploading}
                      onAddFiles={closeAttachmentUpload.addFiles}
                      onRemove={closeAttachmentUpload.remove}
                    />
                    {closeAttachmentUpload.error && (
                      <p className="text-sm font-normal text-destructive">
                        {closeAttachmentUpload.error}
                      </p>
                    )}
                  </Field>
                  <Button className="w-full" onClick={handleCloseIntention}>
                    Confirmar cierre
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </Card>
      )}

      {/* Comments */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageSquare className="size-4" />
          Comentarios
        </h2>
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>
        )}
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="text-sm border-l-2 border-muted pl-3 space-y-0.5">
              <p className="font-medium">{c.users?.full_name ?? "Usuario"}</p>
              <p className="text-muted-foreground">{c.message}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</p>
            </div>
          ))}
        </div>
        <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="flex gap-2 pt-1">
          <Input
            placeholder="Escribe un comentario..."
            className="flex-1"
            {...commentForm.register("message")}
          />
          <Button
            size="sm"
            type="submit"
            disabled={commentForm.formState.isSubmitting || !commentForm.watch("message").trim()}
          >
            {commentForm.formState.isSubmitting ? "..." : "Comentar"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
