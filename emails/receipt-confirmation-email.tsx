import { Section, Text } from "react-email"

import { BaseEmail, DataTable, formatAmount } from "./components/base-email"
import type { MovementIntegrationPayload } from "@/services/google/types"

export function ReceiptConfirmationEmail({ movement }: { movement: MovementIntegrationPayload }) {
  const rows: [string, string][] = [
    ["Folio", movement.folio],
    ["Fecha", movement.movementDate],
    ["Monto", formatAmount(movement.amount)],
    ["Categoría", movement.category]
  ]

  return (
    <BaseEmail preview={`Confirmación de ingreso — Folio ${movement.folio}`}>
      <Section style={{ padding: "24px 32px 8px" }}>
        <Text style={{ margin: 0, fontSize: 15, color: "#333" }}>
          Hemos registrado tu aporte/ingreso correctamente. A continuación el detalle:
        </Text>
      </Section>
      <Section style={{ padding: "8px 32px 24px" }}>
        <DataTable rows={rows} />
      </Section>
      <Section style={{ padding: "0 32px 24px" }}>
        <Text style={{ margin: 0, fontSize: 13, color: "#666" }}>
          Adjuntamos a este correo el comprobante en PDF de tu aporte.
        </Text>
      </Section>
    </BaseEmail>
  )
}
