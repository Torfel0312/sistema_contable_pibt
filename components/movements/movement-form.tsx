"use client"

import { PiggyBank, BadgeCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useMovementForm, type UseMovementFormProps } from "@/hooks/use-movement-form"
import {
  MovementStep1Fields,
  MovementStep2Fields,
  MovementStep3Fields
} from "@/components/movements/movement-form-fields"

export function MovementForm(props: UseMovementFormProps) {
  const state = useMovementForm(props)
  const { mode, error, form, attachmentUpload, isSaveDisabled, isCapitalInjection } = state
  const { onSuccess } = props

  return (
    <form onSubmit={form.handleSubmit(state.onSubmit)} className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {isCapitalInjection ? (
          <Alert variant="success" icon={PiggyBank}>
            <AlertDescription>
              Suma fondos al saldo general. Se registra como ingreso con la categoría{" "}
              <strong className="font-bold text-foreground">Aporte de Capital</strong>.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-center gap-4 px-1">
            <div className="h-px flex-1 bg-border" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Datos del Movimiento
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        <MovementStep1Fields state={state} />
        <MovementStep2Fields state={state} />
        <MovementStep3Fields state={state} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-border">
        {isSaveDisabled && (
          <span className="text-xs text-muted-foreground sm:order-first">
            Ingresa un monto para guardar
          </span>
        )}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || attachmentUpload.isUploading || isSaveDisabled}
          className="h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base flex-1 sm:flex-none"
        >
          {form.formState.isSubmitting ? (
            "Procesando..."
          ) : (
            <>
              <BadgeCheck className="size-4" />
              {mode === "create" ? "Confirmar y Guardar" : "Actualizar Información"}
            </>
          )}
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
