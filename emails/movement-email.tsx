import { Section, Text } from "react-email"

import { BaseEmail, DataTable, formatAmount } from "./components/base-email"
import type { MovementIntegrationPayload } from "@/services/google/types"

export function MovementEmail({ movement }: { movement: MovementIntegrationPayload }) {
  const deliveredByLabel =
    movement.movementTypeLabel === "INGRESO" ? "Entregado por" : "Entregado a"

  const rows: [string, string][] = (
    [
      ["Folio", movement.folio],
      ["Fecha", movement.movementDate],
      ["Tipo", movement.movementTypeLabel],
      ["Monto", formatAmount(movement.amount)],
      ["Categoría", movement.category],
      movement.deliveredBy ? [deliveredByLabel, movement.deliveredBy] : null,
      movement.paymentMethodLabel ? ["Medio de pago", movement.paymentMethodLabel] : null,
      movement.receiptEmail ? ["Comprobante enviado a", movement.receiptEmail] : null,
      movement.notes ? ["Observaciones", movement.notes] : null,
      ["Registrado por", movement.registeredBy]
    ] as ([string, string] | null)[]
  ).filter((r): r is [string, string] => r !== null)

  return (
    <BaseEmail
      preview={`Nuevo movimiento: ${movement.movementTypeLabel} - Folio ${movement.folio}`}
    >
      <Section style={{ padding: "24px 32px 8px" }}>
        <Text style={{ margin: 0, fontSize: 15, color: "#333" }}>
          Se ha registrado un nuevo movimiento:
        </Text>
      </Section>
      <Section style={{ padding: "8px 32px 24px" }}>
        <DataTable rows={rows} />
      </Section>
    </BaseEmail>
  )
}
