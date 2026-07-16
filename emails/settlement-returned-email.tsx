import { Section, Text } from "react-email"

import { ActionButton, BaseEmail, DataTable, formatAmount } from "./components/base-email"

export function SettlementReturnedEmail({
  settlement,
  minister,
  message,
  detailUrl
}: {
  settlement: { amount: number; description: string }
  minister: { full_name: string }
  message: string
  detailUrl: string
}) {
  return (
    <BaseEmail preview="Tu rendición necesita correcciones">
      <Section style={{ padding: "24px 32px 8px" }}>
        <Text style={{ margin: 0, fontSize: 18, color: "#222", fontWeight: 700 }}>
          Tu rendición necesita <span style={{ color: "#d97706" }}>correcciones</span>
        </Text>
        <Text style={{ margin: "8px 0 0", color: "#555", fontSize: 14 }}>
          Hola {minister.full_name}, tesorería revisó tu rendición de gastos y necesita que la
          corrijas antes de aprobarla.
        </Text>
      </Section>
      <Section style={{ padding: "8px 32px" }}>
        <DataTable
          rows={[
            ["Monto", formatAmount(settlement.amount)],
            ["Descripción", settlement.description]
          ]}
        />
      </Section>
      <Section style={{ padding: "8px 32px" }}>
        <Text style={{ margin: 0, fontSize: 13, color: "#999", fontWeight: 600 }}>
          Comentario de tesorería
        </Text>
        <Text style={{ margin: "4px 0 0", fontSize: 14, color: "#333" }}>{message}</Text>
      </Section>
      <Section style={{ padding: "24px 32px" }}>
        <ActionButton label="Corregir rendición" url={detailUrl} />
        <Text style={{ margin: "12px 0 0", fontSize: 12, color: "#999" }}>
          Se requiere inicio de sesión para acceder.
        </Text>
      </Section>
    </BaseEmail>
  )
}
