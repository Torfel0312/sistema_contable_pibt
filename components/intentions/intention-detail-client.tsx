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
  Plus
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { createSettlementSchema } from "@/lib/validators/settlement"
import type {
  ReviewIntentionInput,
  RegisterTransferInput,
  AddCommentInput
} from "@/lib/validators/intention"
import type { CreateSettlementInput } from "@/lib/validators/settlement"
import type { intentionsService } from "@/services/intentions/intentions.service"
import type { settlementsService } from "@/services/settlements/settlements.service"
import { reviewRequest, registerTransfer, addComment } from "@/app/actions/requests"
import { createMinistrySettlement } from "@/app/actions/ministry-settlements"

type Intention = Awaited<ReturnType<typeof intentionsService.getById>>
type Transfer = Awaited<ReturnType<typeof intentionsService.getTransfer>>
type Comment = Awaited<ReturnType<typeof intentionsService.getComments>>[number]
type Settlement = Awaited<ReturnType<typeof settlementsService.list>>[number]

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: "text-amber-500", label: "Pendiente de revisión" },
  APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Aprobada" },
  REJECTED: { icon: XCircle, color: "text-red-500", label: "Rechazada" }
}

export function IntentionDetailClient({
  intention,
  comments: initialComments,
  transfer,
  settlements: initialSettlements,
  canReview,
  canSubmit
}: {
  intention: Intention
  comments: Comment[]
  transfer: Transfer
  settlements: Settlement[]
  canReview: boolean
  canSubmit: boolean
}) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements)
  const [currentTransfer, setCurrentTransfer] = useState<Transfer>(transfer)
  const status = STATUS_CONFIG[intention.status]
  const StatusIcon = status.icon
  const isMinister = canSubmit

  const [reviewOpen, setReviewOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [settlementOpen, setSettlementOpen] = useState(false)
  const attachmentUpload = useAttachmentUpload()

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
      attachment_url: undefined
    }
  })

  // eslint-disable-next-line react-hooks/incompatible-library
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
      const settlData = await createMinistrySettlement(values)
      setSettlements((prev) => [...prev, settlData as unknown as Settlement])
      setSettlementOpen(false)
      settlementForm.reset({
        intention_id: intention.id,
        amount: "",
        description: "",
        expense_date: ""
      })
      toast.success("Rendición enviada para revisión")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar rendición")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Volver
      </Button>

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
            <span className="text-muted-foreground">Descripción: </span>
            {intention.description}
          </div>
          <div>
            <span className="text-muted-foreground">Método de financiamiento: </span>
            {intention.funding_method === "TRANSFER" ? "Transferencia anticipada" : "Reembolso"}
          </div>
          {intention.purpose && (
            <div>
              <span className="text-muted-foreground">Propósito: </span>
              {intention.purpose}
            </div>
          )}
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
                      <Input type="number" min={1} {...transferForm.register("amount")} />
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
                  <form
                    onSubmit={settlementForm.handleSubmit(handleSubmitSettlement)}
                    className="space-y-4"
                  >
                    <Field>
                      <FieldLabel>Monto del gasto (CLP) *</FieldLabel>
                      <Input type="number" min={1} {...settlementForm.register("amount")} />
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={settlementForm.formState.isSubmitting}
                    >
                      {settlementForm.formState.isSubmitting ? "Enviando..." : "Enviar rendición"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin rendiciones aún.</p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s) => (
                <div key={s.id} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatCLP(s.amount)}</span>
                    <span
                      className={`text-xs font-medium ${
                        s.status === "APPROVED"
                          ? "text-green-600"
                          : s.status === "REJECTED"
                            ? "text-red-500"
                            : "text-amber-500"
                      }`}
                    >
                      {s.status === "APPROVED"
                        ? "Aprobada"
                        : s.status === "REJECTED"
                          ? "Rechazada"
                          : "En revisión"}
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
                  {s.review_message && (
                    <p className="text-xs bg-muted/50 rounded px-2 py-1">
                      <span className="font-medium">Revisor: </span>
                      {s.review_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
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
