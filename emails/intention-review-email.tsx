import { Section, Text } from "react-email"

import { ActionButton, BaseEmail, DataTable, formatAmount } from "./components/base-email"

export function IntentionReviewEmail({
  intention,
  minister,
  action,
  detailUrl
}: {
  intention: { amount: number; purpose: string }
  minister: { full_name: string }
  action: "APPROVED" | "REJECTED"
  detailUrl: string
}) {
  const isApproved = action === "APPROVED"
  const statusLabel = isApproved ? "aprobada" : "rechazada"
  const statusColor = isApproved ? "#16a34a" : "#dc2626"

  return (
    <BaseEmail preview={`Tu solicitud fue ${statusLabel}`}>
      <Section style={{ padding: "24px 32px 8px" }}>
        <Text style={{ margin: 0, fontSize: 18, color: "#222", fontWeight: 700 }}>
          Tu solicitud fue <span style={{ color: statusColor }}>{statusLabel}</span>
        </Text>
        <Text style={{ margin: "8px 0 0", color: "#555", fontSize: 14 }}>
          Hola {minister.full_name}, tu solicitud de intención de presupuesto ha sido revisada.
        </Text>
      </Section>
      <Section style={{ padding: "8px 32px" }}>
        <DataTable
          rows={[
            ["Monto", formatAmount(intention.amount)],
            ["Propósito", intention.purpose]
          ]}
        />
      </Section>
      <Section style={{ padding: "24px 32px" }}>
        <ActionButton label="Ver detalle" url={detailUrl} />
        <Text style={{ margin: "12px 0 0", fontSize: 12, color: "#999" }}>
          Se requiere inicio de sesión para acceder.
        </Text>
      </Section>
    </BaseEmail>
  )
}
