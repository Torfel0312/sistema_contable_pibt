import { Section, Text } from "react-email"

import { ActionButton, BaseEmail, DataTable, formatAmount } from "./components/base-email"

export function IntentionNotificationEmail({
  intention,
  reviewUrl
}: {
  intention: { amount: number; description: string }
  reviewUrl: string
}) {
  return (
    <BaseEmail preview="Nueva solicitud de presupuesto">
      <Section style={{ padding: "24px 32px 8px" }}>
        <Text style={{ margin: 0, fontSize: 18, color: "#222", fontWeight: 700 }}>
          Nueva solicitud de intención de presupuesto
        </Text>
      </Section>
      <Section style={{ padding: "8px 32px" }}>
        <DataTable
          rows={[
            ["Monto solicitado", formatAmount(intention.amount)],
            ["Descripción", intention.description]
          ]}
        />
      </Section>
      <Section style={{ padding: "24px 32px" }}>
        <ActionButton label="Revisar solicitud" url={reviewUrl} />
        <Text style={{ margin: "12px 0 0", fontSize: 12, color: "#999" }}>
          Se requiere inicio de sesión para acceder.
        </Text>
      </Section>
    </BaseEmail>
  )
}
