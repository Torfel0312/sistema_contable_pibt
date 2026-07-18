"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Clock, CheckCircle2, XCircle, FileText, Ban } from "lucide-react"
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
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions
} from "@/components/ui/item"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDate, formatCLP } from "@/lib/utils"
import { createIntentionSchema } from "@/lib/validators/intention"
import type { CreateIntentionInput } from "@/lib/validators/intention"
import { MIN_REQUEST_AMOUNT, MAX_REQUEST_AMOUNT } from "@/lib/constants/requests"
import type { intentionsService } from "@/services/intentions/intentions.service"
import type { ministriesService } from "@/services/ministries/ministries.service"
import { createRequest } from "@/app/actions/requests"

type Intention = Awaited<ReturnType<typeof intentionsService.list>>[number]
type MinistryAssignment = Awaited<ReturnType<typeof ministriesService.getMinistryForUser>>
type Ministry = NonNullable<MinistryAssignment>["ministries"] | null

const STATUS_ICONS = {
  DRAFT: <FileText className="size-4 text-muted-foreground" />,
  PENDING: <Clock className="size-4 text-warn" />,
  APPROVED: <CheckCircle2 className="size-4 text-income" />,
  REJECTED: <XCircle className="size-4 text-expense" />,
  CANCELLED: <Ban className="size-4 text-muted-foreground" />
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
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
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
                <ItemGroup>
                  {openIntentions.map((intention) => (
                    <IntentionRow
                      key={intention.id}
                      intention={intention}
                      isMinister={isMinister}
                      onClick={() => router.push(`/requests/${intention.id}`)}
                    />
                  ))}
                </ItemGroup>
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
                <ItemGroup className="opacity-75">
                  {closedIntentions.map((intention) => (
                    <IntentionRow
                      key={intention.id}
                      intention={intention}
                      isMinister={isMinister}
                      onClick={() => router.push(`/requests/${intention.id}`)}
                    />
                  ))}
                </ItemGroup>
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

function IntentionRow({
  intention,
  isMinister,
  onClick
}: {
  intention: Intention
  isMinister: boolean
  onClick: () => void
}) {
  return (
    <Item className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={onClick}>
      <ItemContent>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{STATUS_ICONS[intention.status]}</div>
          <div className="flex-1 min-w-0">
            <ItemTitle className="flex items-center gap-2">
              {formatCLP(intention.amount)}
            </ItemTitle>
            <ItemDescription>{intention.purpose}</ItemDescription>
            <p className="text-xs text-muted-foreground mt-0.5">
              {FUNDING_METHOD_LABELS[intention.funding_method]}
            </p>
            {!isMinister && intention.ministries && (
              <p className="text-xs text-muted-foreground mt-0.5">{intention.ministries.name}</p>
            )}
          </div>
        </div>
      </ItemContent>
      <ItemActions>
        <div className="text-right">
          <p className="text-xs font-medium">{STATUS_LABELS[intention.status]}</p>
          <p className="text-xs text-muted-foreground">{formatDate(intention.created_at)}</p>
        </div>
      </ItemActions>
    </Item>
  )
}
