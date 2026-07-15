"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Mail, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { emailVoucher } from "@/app/actions/vouchers"
import type { MovementIntegrationPayload } from "@/services/google/types"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function buildVoucherBlob(movement: MovementIntegrationPayload): Promise<Blob> {
  const [{ pdf }, { VoucherDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/vouchers/voucher-document")
  ])

  return pdf(<VoucherDocument movement={movement} />).toBlob()
}

export function VoucherActions({ movement }: { movement: MovementIntegrationPayload }) {
  const [sharing, setSharing] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [email, setEmail] = useState(movement.receiptEmail ?? "")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onShare() {
    setSharing(true)
    try {
      const blob = await buildVoucherBlob(movement)
      const file = new File([blob], `comprobante-${movement.folio}.pdf`, {
        type: "application/pdf"
      })

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Comprobante ${movement.folio}` })
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return
          toast.error("No se pudo compartir el comprobante")
        }
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `comprobante-${movement.folio}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch {
      toast.error("No se pudo generar el comprobante")
    } finally {
      setSharing(false)
    }
  }

  function onSubmitEmail() {
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Ingresa un correo válido")
      return
    }
    setEmailError(null)
    setSending(true)

    const promise = emailVoucher(movement.movementId, email.trim()).then((result) => {
      if ("error" in result) throw new Error(result.error)
      return result
    })

    toast.promise(promise, {
      loading: "Enviando comprobante...",
      success: () => {
        setEmailDialogOpen(false)
        return "Comprobante enviado"
      },
      error: (e: Error) => e.message || "No se pudo enviar el comprobante"
    })

    void promise.finally(() => setSending(false))
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" disabled={sharing} onClick={onShare}>
        <Share2 className="size-4" data-icon="inline-start" />
        {sharing ? "Generando..." : "Compartir comprobante"}
      </Button>

      <Button type="button" variant="outline" onClick={() => setEmailDialogOpen(true)}>
        <Mail className="size-4" data-icon="inline-start" />
        Enviar por correo
      </Button>

      <Dialog
        open={emailDialogOpen}
        onOpenChange={(o) => {
          setEmailDialogOpen(o)
          if (!o) setEmailError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar comprobante por correo</DialogTitle>
            <DialogDescription>
              Se enviará el comprobante del folio {movement.folio} al correo indicado.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmitEmail()
            }}
            className="flex flex-col gap-4"
          >
            <Field>
              <FieldLabel htmlFor="voucher-email">Correo destino *</FieldLabel>
              <Input
                id="voucher-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldError errors={[emailError ? { message: emailError } : undefined]} />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={sending}>
                {sending ? "Enviando..." : "Enviar comprobante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
