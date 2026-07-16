"use client"

import { useState, useCallback, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { cn, formatDate, formatCLP } from "@/lib/utils"
import { attachmentHref } from "@/lib/storage/attachments"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent
} from "@/components/ui/empty"
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions
} from "@/components/ui/item"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { format } from "date-fns"
import {
  Plus,
  Receipt,
  Calendar,
  Hash,
  Banknote,
  FileText,
  Paperclip,
  ExternalLink
} from "lucide-react"
import type { Database } from "@/types/database.types"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { FileInput } from "@/components/ui/file-input"
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker"
import { Spinner } from "@/components/ui/spinner"
import { createInvoice, updateInvoiceStatus } from "@/app/actions/invoices"

type Invoice = Database["public"]["Tables"]["invoices"]["Row"]

const invoiceFormSchema = z.object({
  number: z.string().min(1, "El número de boleta es requerido"),
  date: z.date(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional()
})
type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export function SettlementsClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const pendingTotal = useMemo(
    () => invoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + Number(i.amount), 0),
    [invoices]
  )
  const settledTotal = useMemo(
    () => invoices.filter((i) => i.status === "SETTLED").reduce((s, i) => s + Number(i.amount), 0),
    [invoices]
  )

  const form = useForm<z.input<typeof invoiceFormSchema>, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: "",
      date: new Date(),
      amount: "",
      description: ""
    }
  })

  const handleSubmit = useCallback(
    async (values: InvoiceFormValues) => {
      try {
        let attachment_url: string | null = null

        if (attachedFile) {
          const supabase = createSupabaseBrowserClient()
          const ext = attachedFile.name.split(".").pop() ?? "bin"
          const path = `${crypto.randomUUID()}.${ext}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("invoice-attachments")
            .upload(path, attachedFile, { upsert: false })
          if (uploadError) throw uploadError
          attachment_url = uploadData.path
        }

        const created = await createInvoice({
          number: values.number,
          date: format(values.date, "yyyy-MM-dd"),
          amount: values.amount,
          description: values.description || null,
          attachment_url
        })
        setInvoices((prev) => [created as unknown as Invoice, ...prev])
        form.reset({
          number: "",
          date: new Date(),
          amount: "",
          description: ""
        })
        setAttachedFile(null)
        setOpen(false)
        toast.success("Boleta registrada")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al registrar la boleta")
      }
    },
    [attachedFile, form]
  )

  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null)

  const toggleStatus = useCallback(async (invoice: Invoice) => {
    const nextStatus = invoice.status === "SETTLED" ? "PENDING" : "SETTLED"
    setPendingInvoiceId(invoice.id)
    try {
      const updated = (await updateInvoiceStatus(invoice.id, nextStatus)) as unknown as Invoice
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setSelectedInvoice((prev) => (prev?.id === updated.id ? updated : prev))
      toast.success(nextStatus === "SETTLED" ? "Boleta rendida" : "Boleta reabierta")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el estado")
    } finally {
      setPendingInvoiceId(null)
    }
  }, [])

  return (
    <section className="mx-auto max-w-6xl flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Rendiciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona la rendición de boletas.{" "}
            <strong className="text-primary font-semibold">Plazo máximo: 30 de cada mes.</strong>
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              form.reset({
                number: "",
                date: new Date(),
                amount: "",
                description: ""
              })
              setAttachedFile(null)
            }
          }}
        >
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus data-icon="inline-start" />
                Nueva rendición
              </Button>
            }
          />
          <DialogContent className="w-[95vw] sm:max-w-xl bg-card p-0 overflow-y-auto max-h-[90vh]">
            <div className="p-6 sm:p-10 flex flex-col gap-8">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">
                  Nueva rendición
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-base mt-1">
                  Ingrese los detalles de la boleta para ser rendida.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                    Detalles de la Boleta
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel
                      htmlFor="invoice-number"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Número de Boleta
                    </FieldLabel>
                    <Input
                      id="invoice-number"
                      placeholder="Ej: BOL-001"
                      className="h-12 bg-muted border-none rounded-xl px-5 text-base font-medium"
                      {...form.register("number")}
                    />
                    <FieldError errors={[form.formState.errors.number]} />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="invoice-date"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Fecha de Emisión
                    </FieldLabel>
                    <Controller
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="h-12"
                        />
                      )}
                    />
                    <FieldError errors={[form.formState.errors.date]} />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="invoice-amount"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Monto Total
                    </FieldLabel>
                    <Controller
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <CurrencyInput
                          id="invoice-amount"
                          placeholder="0"
                          className="h-12 bg-muted border-none rounded-xl px-5 text-lg font-bold"
                          value={field.value as number | string | undefined}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <FieldError errors={[form.formState.errors.amount]} />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="invoice-description"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Descripción
                    </FieldLabel>
                    <Input
                      id="invoice-description"
                      placeholder="Descripción de la boleta..."
                      className="h-12 bg-muted border-none rounded-xl px-5 text-base font-medium"
                      {...form.register("description")}
                    />
                    <FieldError errors={[form.formState.errors.description]} />
                  </Field>

                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <FieldLabel
                      htmlFor="invoice-file"
                      className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Comprobante (foto o archivo)
                    </FieldLabel>
                    <FileInput id="invoice-file" value={attachedFile} onChange={setAttachedFile} />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <Button type="submit" className="h-11" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Registrando..." : "Registrar Boleta"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-11"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Total boletas
            </p>
            <p className="font-heading text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {invoices.length}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Pendiente
            </p>
            <p className="font-heading text-2xl font-bold tracking-tight text-destructive tabular-nums">
              {formatCLP(pendingTotal)}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Rendido
            </p>
            <p className="font-heading text-2xl font-bold tracking-tight text-income tabular-nums">
              {formatCLP(settledTotal)}
            </p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <Empty className="border-0 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Receipt />
              </EmptyMedia>
              <EmptyTitle>Sin boletas</EmptyTitle>
              <EmptyDescription>
                No hay boletas registradas para el período actual.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button className="gap-2" onClick={() => setOpen(true)}>
                <Plus data-icon="inline-start" />
                Nueva rendición
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : (
        <ItemGroup>
          {invoices.map((invoice) => (
            <Item
              key={invoice.id}
              variant="outline"
              onClick={() => setSelectedInvoice(invoice)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <ItemContent>
                <ItemTitle className="font-bold text-foreground">{invoice.number}</ItemTitle>
                <ItemDescription>
                  {formatDate(invoice.date)} ·{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {formatCLP(Number(invoice.amount))}
                  </span>
                  {invoice.description && ` · ${invoice.description}`}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    invoice.status === "SETTLED" ? "badge-income" : "bg-muted text-muted-foreground"
                  )}
                >
                  {invoice.status === "SETTLED" ? "Rendida" : "Pendiente"}
                </span>
                <Button
                  variant={invoice.status === "SETTLED" ? "outline" : "default"}
                  size="xs"
                  disabled={pendingInvoiceId === invoice.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStatus(invoice)
                  }}
                  className="rounded-full px-5 gap-1.5"
                >
                  {pendingInvoiceId === invoice.id && <Spinner className="size-3" />}
                  {invoice.status === "SETTLED" ? "Reabrir" : "Rendir"}
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <Sheet open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          {selectedInvoice && (
            <div className="flex flex-col gap-8 p-6 sm:p-8">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Receipt className="size-5 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold">{selectedInvoice.number}</SheetTitle>
                    <SheetDescription className="text-xs">Detalle de boleta</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <Calendar className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Fecha de Emisión
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(selectedInvoice.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <Banknote className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Monto
                    </p>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {formatCLP(Number(selectedInvoice.amount))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <Hash className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Número de Boleta
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedInvoice.number}
                    </p>
                  </div>
                </div>

                {selectedInvoice.description && (
                  <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3">
                    <FileText className="size-4 shrink-0 translate-y-0.5 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Descripción
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedInvoice.description}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Estado
                    </p>
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                        selectedInvoice.status === "SETTLED"
                          ? "badge-income"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {selectedInvoice.status === "SETTLED" ? "Rendida" : "Pendiente"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Comprobante
                    </p>
                    {selectedInvoice.attachment_url ? (
                      <a
                        href={
                          attachmentHref("invoice-attachments", selectedInvoice.attachment_url) ??
                          "#"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline truncate"
                      >
                        Ver archivo <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm italic text-muted-foreground/60">Sin comprobante</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-border">
                {pendingInvoiceId === selectedInvoice.id && (
                  <Marker role="status" aria-live="polite">
                    <MarkerIcon>
                      <Spinner />
                    </MarkerIcon>
                    <MarkerContent>Actualizando estado…</MarkerContent>
                  </Marker>
                )}
                <Button
                  variant={selectedInvoice.status === "SETTLED" ? "outline" : "default"}
                  className="h-11"
                  disabled={pendingInvoiceId === selectedInvoice.id}
                  onClick={() => toggleStatus(selectedInvoice)}
                >
                  {selectedInvoice.status === "SETTLED" ? "Reabrir boleta" : "Marcar como rendida"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
