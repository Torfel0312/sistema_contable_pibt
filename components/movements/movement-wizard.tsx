"use client"

import { useState } from "react"
import { Check, Wallet, UserRound, Receipt, ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMovementForm, type UseMovementFormProps } from "@/hooks/use-movement-form"
import {
  MovementStep1Fields,
  MovementStep2Fields,
  MovementStep3Fields
} from "@/components/movements/movement-form-fields"

const STEPS = [
  {
    label: "Tipo y monto",
    icon: Wallet,
    hint: "Empieza indicando si es un ingreso o egreso, cuánto y cuándo ocurrió.",
    fields: ["movement_type", "amount", "movement_date"] as const
  },
  {
    label: "Quién y medio de pago",
    icon: UserRound,
    hint: "Ayuda a identificar quién entregó el dinero y cómo se pagó.",
    fields: [
      "delivered_by",
      "receipt_email",
      "payment_method_id",
      "category_id",
      "subcategory_id"
    ] as const
  },
  {
    label: "Comprobantes",
    icon: Receipt,
    hint: "Adjunta el comprobante y cualquier detalle extra antes de confirmar.",
    fields: [] as const
  }
]

export function MovementWizard(props: UseMovementFormProps) {
  const state = useMovementForm(props)
  const { form, error, attachmentUpload } = state
  const [step, setStep] = useState(0)

  const isLastStep = step === STEPS.length - 1
  const StepIcon = STEPS[step].icon

  async function goNext() {
    const fields = STEPS[step].fields
    const valid = fields.length > 0 ? await form.trigger([...fields]) : true
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        {STEPS.map((s, index) => (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-none">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[12px] font-bold border",
                  index < step && "bg-income border-income text-white",
                  index === step && "bg-primary border-primary text-primary-foreground",
                  index > step && "bg-muted border-border text-faint"
                )}
              >
                {index < step ? <Check className="size-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold whitespace-nowrap",
                  index === step || index < step ? "text-foreground" : "text-faint"
                )}
              >
                {s.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-2", index < step ? "bg-income" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card border border-border p-7 flex flex-col gap-6 min-h-[320px]">
        <Alert variant="info" icon={StepIcon}>
          <AlertDescription>{STEPS[step].hint}</AlertDescription>
        </Alert>

        <div className={step === 0 ? "block" : "hidden"}>
          <MovementStep1Fields state={state} />
        </div>
        <div className={step === 1 ? "block" : "hidden"}>
          <MovementStep2Fields state={state} />
        </div>
        <div className={step === 2 ? "block" : "hidden"}>
          <MovementStep3Fields state={state} />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border mt-auto">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4" />
              Atrás
            </Button>
          ) : (
            <span />
          )}

          {!isLastStep ? (
            <Button type="button" onClick={goNext}>
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={form.formState.isSubmitting || attachmentUpload.isUploading}
              onClick={form.handleSubmit(state.onSubmit)}
            >
              <BadgeCheck className="size-4" />
              {form.formState.isSubmitting ? "Procesando..." : "Confirmar y Guardar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
