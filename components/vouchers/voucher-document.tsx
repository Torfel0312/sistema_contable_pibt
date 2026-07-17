import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import type { MovementIntegrationPayload } from "@/services/google/types"

// Matches the app's own CSS custom properties (app/globals.css :root) so the
// PDF reads as the same product, not a generic invoice template.
const COLORS = {
  primary: "#1558b0",
  primaryForeground: "#ffffff",
  foreground: "#0a2a58",
  muted: "#f0f7ff",
  mutedForeground: "#4a7ab0",
  destructive: "#e85040",
  border: "#ddeeff"
}

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.foreground
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 32
  },
  orgName: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primaryForeground
  },
  title: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: 700,
    color: "#cfe2f9",
    letterSpacing: 1
  },
  body: {
    padding: 32
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `1px solid ${COLORS.border}`
  },
  date: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.primary
  },
  badge: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primaryForeground,
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10
  },
  badgeExpense: {
    backgroundColor: COLORS.destructive
  },
  table: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4
  },
  row: {
    flexDirection: "row",
    borderBottom: `1px solid ${COLORS.border}`
  },
  rowLast: {
    borderBottom: "none"
  },
  label: {
    width: "38%",
    padding: 10,
    fontWeight: 700,
    fontSize: 9,
    color: COLORS.mutedForeground,
    backgroundColor: COLORS.muted
  },
  value: {
    width: "62%",
    padding: 10,
    color: COLORS.foreground
  },
  amountValue: {
    width: "62%",
    padding: 10,
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primary
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.border}`,
    fontSize: 8,
    color: COLORS.mutedForeground,
    textAlign: "center"
  }
})

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount)
}

export function VoucherDocument({ movement }: { movement: MovementIntegrationPayload }) {
  const isIncome = movement.movementTypeLabel === "INGRESO"
  const deliveredByLabel = isIncome ? "Entregado por" : "Entregado a"

  const rows: [string, string, boolean?][] = (
    [
      ["Fecha", movement.movementDate],
      ["Monto", formatAmount(movement.amount), true],
      ["Categoría", movement.category],
      movement.deliveredBy ? [deliveredByLabel, movement.deliveredBy] : null,
      movement.paymentMethodLabel ? ["Medio de pago", movement.paymentMethodLabel] : null,
      movement.receiptEmail ? ["Comprobante enviado a", movement.receiptEmail] : null,
      movement.notes ? ["Observaciones", movement.notes] : null,
      ["Registrado por", movement.registeredBy]
    ] as ([string, string, boolean?] | null)[]
  ).filter((r): r is [string, string, boolean?] => r !== null)

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{movement.organizationName ?? "Sistema contable PIBT"}</Text>
          <Text style={styles.title}>
            {isIncome ? "COMPROBANTE DE INGRESO" : "COMPROBANTE DE EGRESO"}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.date}>{movement.movementDate}</Text>
            <Text style={isIncome ? styles.badge : [styles.badge, styles.badgeExpense]}>
              {movement.movementTypeLabel}
            </Text>
          </View>

          <View style={styles.table}>
            {rows.map(([label, value, highlight], index) => (
              <View
                style={index === rows.length - 1 ? [styles.row, styles.rowLast] : styles.row}
                key={label}
              >
                <Text style={styles.label}>{label}</Text>
                <Text style={highlight ? styles.amountValue : styles.value}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Documento generado automáticamente por el sistema contable — no requiere firma.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
