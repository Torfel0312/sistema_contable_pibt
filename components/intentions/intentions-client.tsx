"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Clock, CheckCircle2, XCircle, FileText, Ban } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDate, formatCLP, avatarColorFor, initialsFor } from "@/lib/utils"
import { createIntentionSchema } from "@/lib/validators/intention"
import type { CreateIntentionInput } from "@/lib/validators/intention"
import { MIN_REQUEST_AMOUNT, MAX_REQUEST_AMOUNT } from "@/lib/constants/requests"
import type { intentionsService } from "@/services/intentions/intentions.service"
import type { ministriesService } from "@/services/ministries/ministries.service"
import { createRequest } from "@/app/actions/requests"

type Intention = Awaited<ReturnType<typeof intentionsService.list>>[number]
type MinistryAssignment = Awaited<ReturnType<typeof ministriesService.getMinistryForUser>>
type Ministry = NonNullable<MinistryAssignment>["ministries"] | null

const STATUS_LINE_META = {
  DRAFT: { icon: FileText, color: "text-muted-foreground" },
  PENDING: { icon: Clock, color: "text-warn" },
  APPROVED: { icon: CheckCircle2, color: "text-income" },
  REJECTED: { icon: XCircle, color: "text-expense" },
  CANCELLED: { icon: Ban, color: "text-muted-foreground" }
}

const STATUS_LABELS = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada"
}

const FUNDING_METHOD_LABELS = {
  REIMBURSEMENT: "Reembolso",
  TRANSFER: "Transferencia anticipada"
}

// Method pill colors: transfer reads as the "primary-2" (violet) family per the
// design spec, reimbursement stays a neutral primary tint.
const FUNDING_METHOD_PILL = {
  REIMBURSEMENT: "bg-primary-soft text-primary",
  TRANSFER: "bg-role-purple-surface text-role-purple"
}

export function IntentionsClient({
  canCreateRequest,
  intentions: initialIntentions,
  ministry
}: {
  canCreateRequest: boolean
  intentions: Intention[]
  ministry: Ministry
}) {
  const router = useRouter()
  const [intentions, setIntentions] = useState<Intention[]>(initialIntentions)
  const [open, setOpen] = useState(false)

  const isMinister = canCreateRequest

  // Closed = rejected/cancelled outright, or its settlement flow was closed out
  // by tesorería (settlement_closed_at set). Everything else still needs
  // someone's attention (including DRAFT, which is still being worked on).
  const closedIntentions = intentions.filter(
    (i) => i.status === "REJECTED" || i.status === "CANCELLED" || !!i.settlement_closed_at
  )
  const openIntentions = intentions.filter(
    (i) => i.status !== "REJECTED" && i.status !== "CANCELLED" && !i.settlement_closed_at
  )
  const openTotal = openIntentions.reduce((sum, i) => sum + i.amount, 0)
  const rejectedCount = intentions.filter((i) => i.status === "REJECTED").length

  type IntentionFormValues = Omit<CreateIntentionInput, "amount"> & { amount: string }
  const form = useForm<IntentionFormValues, unknown, CreateIntentionInput>({
    resolver: zodResolver(createIntentionSchema) as Resolver<
      IntentionFormValues,
      unknown,
      CreateIntentionInput
    >,
    defaultValues: {
      amount: "",
      purpose: "",
      date_needed: "",
      funding_method: "REIMBURSEMENT"
    }
  })

  async function handleSubmit(values: CreateIntentionInput) {
    try {
      const created = await createRequest({
        ...values,
        date_needed: values.date_needed || undefined
      })
      setIntentions((prev) => [created as unknown as Intention, ...prev])
      setOpen(false)
      form.reset({
        amount: "",
        purpose: "",
        date_needed: "",
        funding_method: "REIMBURSEMENT",
        isDraft: false
      })
      toast.success(values.isDraft ? "Borrador guardado" : "Solicitud enviada al equipo de tesorería")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar solicitud")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            Solicitudes de Dinero
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isMinister
              ? `Ministerio: ${ministry?.name ?? "Sin asignar"}`
              : "Todas las solicitudes"}
          </p>
        </div>
        {isMinister && (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o)
                form.reset({
                  amount: "",
                  purpose: "",
                  date_needed: "",
                  funding_method: "REIMBURSEMENT"
                })
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="size-4" />
                  Nueva solicitud
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitud de dinero</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="int-amount">Monto solicitado (CLP) *</FieldLabel>
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <CurrencyInput
                        id="int-amount"
                        placeholder="100.000"
                        value={field.value}
                        onChange={(value) => field.onChange(value === undefined ? "" : String(value))}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Entre ${MIN_REQUEST_AMOUNT.toLocaleString("es-CL")} y $
                    {MAX_REQUEST_AMOUNT.toLocaleString("es-CL")}
                  </p>
                  <FieldError errors={[form.formState.errors.amount]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="int-purpose">Propósito *</FieldLabel>
                  <Input
                    id="int-purpose"
                    placeholder="Ej: Materiales para campamento de jóvenes"
                    {...form.register("purpose")}
                  />
                  <FieldError errors={[form.formState.errors.purpose]} />
                </Field>
                <Field>
                  <FieldLabel>Fecha en que se necesita</FieldLabel>
                  <Controller
                    control={form.control}
                    name="date_needed"
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
                  <FieldError errors={[form.formState.errors.date_needed]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="int-funding-method">Método de financiamiento *</FieldLabel>
                  <NativeSelect
                    id="int-funding-method"
                    className="w-full"
                    {...form.register("funding_method")}
                  >
                    <NativeSelectOption value="REIMBURSEMENT">
                      Reembolso (gasto primero, rindo después)
                    </NativeSelectOption>
                    <NativeSelectOption value="TRANSFER">
                      Transferencia anticipada (la iglesia transfiere primero)
                    </NativeSelectOption>
                  </NativeSelect>
                  <FieldError errors={[form.formState.errors.funding_method]} />
                </Field>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={form.formState.isSubmitting}
                    onClick={form.handleSubmit((values) => handleSubmit({ ...values, isDraft: true }))}
                  >
                    Guardar borrador
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={form.formState.isSubmitting}
                    onClick={form.handleSubmit((values) => handleSubmit({ ...values, isDraft: false }))}
                  >
                    {form.formState.isSubmitting ? "Enviando..." : "Enviar solicitud"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {intentions.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <FileText className="size-10 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Sin solicitudes</EmptyTitle>
            <EmptyDescription>
              {isMinister
                ? "Crea tu primera solicitud de dinero."
                : "No hay solicitudes registradas."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Solicitado (abiertas)
              </div>
              <div className="text-xl font-extrabold">{formatCLP(openTotal)}</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Solicitudes abiertas
              </div>
              <div className="text-xl font-extrabold">{openIntentions.length}</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Rechazadas
              </div>
              <div className="text-xl font-extrabold text-expense">{rejectedCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-income" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Abiertas
                </h2>
                <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {openIntentions.length}
                </span>
              </div>
              {openIntentions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {openIntentions.map((intention) => (
                    <IntentionCard
                      key={intention.id}
                      intention={intention}
                      isMinister={isMinister}
                      closed={false}
                      onClick={() => router.push(`/requests/${intention.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-1">Sin solicitudes abiertas.</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-expense" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Cerradas
                </h2>
                <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {closedIntentions.length}
                </span>
              </div>
              {closedIntentions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {closedIntentions.map((intention) => (
                    <IntentionCard
                      key={intention.id}
                      intention={intention}
                      isMinister={isMinister}
                      closed
                      onClick={() => router.push(`/requests/${intention.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-1">Sin solicitudes cerradas.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function IntentionCard({
  intention,
  isMinister,
  closed,
  onClick
}: {
  intention: Intention
  isMinister: boolean
  closed: boolean
  onClick: () => void
}) {
  const ministryName = intention.ministries?.name ?? "Sin ministerio"
  const { icon: StatusIcon, color: statusColor } = STATUS_LINE_META[intention.status]

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-2xl border border-border p-[18px] transition-colors",
        closed ? "bg-muted/40" : "bg-card shadow-[0_1px_2px_rgba(22,17,41,.04)] hover:border-input"
      )}
    >
      {!isMinister && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex size-[30px] shrink-0 items-center justify-center rounded-[9px] text-[11px] font-extrabold text-white",
                closed && "opacity-60"
              )}
              style={{ background: avatarColorFor(ministryName) }}
            >
              {initialsFor(ministryName)}
            </div>
            <span
              className={cn(
                "text-xs font-semibold",
                closed ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {ministryName}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              closed ? "bg-muted text-muted-foreground" : FUNDING_METHOD_PILL[intention.funding_method]
            )}
          >
            {FUNDING_METHOD_LABELS[intention.funding_method]}
          </span>
        </div>
      )}

      <p
        className={cn(
          "font-heading text-[22px] font-extrabold tracking-tight tabular-nums",
          closed && "text-muted-foreground"
        )}
      >
        {formatCLP(intention.amount)}
      </p>
      <p className={cn("text-sm mb-3.5", closed ? "text-muted-foreground/70" : "text-muted-foreground")}>
        {intention.purpose}
      </p>
      {isMinister && (
        <p className="text-xs text-muted-foreground mb-3.5 -mt-2.5">
          {FUNDING_METHOD_LABELS[intention.funding_method]}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", statusColor)}>
          <StatusIcon className="size-3.5" />
          {STATUS_LABELS[intention.status]}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {formatDate(intention.created_at)}
        </span>
      </div>
    </div>
  )
}
