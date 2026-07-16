import { Section, Text } from "react-email"

import { ActionButton, BaseEmail, DataTable, formatAmount } from "./components/base-email"

export function TransferNotificationEmail({
  intention,
  minister,
  detailUrl
}: {
  intention: { amount: number; purpose: string }
  minister: { full_name: string }
  detailUrl: string
}) {
  return (
    <BaseEmail preview="Transferencia registrada">
      <Section style={{ padding: "24px 32px 8px" }}>
        <Text style={{ margin: 0, fontSize: 18, color: "#222", fontWeight: 700 }}>
          Transferencia registrada
        </Text>
        <Text style={{ margin: "8px 0 0", color: "#555", fontSize: 14 }}>
          Hola {minister.full_name}, la transferencia correspondiente a tu solicitud ha sido
          registrada por el equipo de tesorería.
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
      <Section style={{ padding: "8px 32px 24px" }}>
        <Text style={{ margin: 0, color: "#555", fontSize: 14 }}>
          Recuerda que debes presentar tu rendición de gastos con los documentos de respaldo dentro
          de los próximos 30 días.
        </Text>
      </Section>
      <Section style={{ padding: "0 32px 24px" }}>
        <ActionButton label="Ir a mi solicitud" url={detailUrl} />
        <Text style={{ margin: "12px 0 0", fontSize: 12, color: "#999" }}>
          Se requiere inicio de sesión para acceder.
        </Text>
      </Section>
    </BaseEmail>
  )
}
