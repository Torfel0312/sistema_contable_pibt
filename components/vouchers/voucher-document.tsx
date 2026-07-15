import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import type { MovementIntegrationPayload } from "@/services/google/types"

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#222"
  },
  header: {
    marginBottom: 16
  },
  orgName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a3a5c"
  },
  title: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700
  },
  folioRow: {
    marginBottom: 16,
    borderBottom: "1px solid #eee",
    paddingBottom: 12
  },
  folio: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a3a5c"
  },
  date: {
    marginTop: 4,
    fontSize: 10,
    color: "#555"
  },
  table: {
    border: "1px solid #eee"
  },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #eee"
  },
  label: {
    width: "40%",
    padding: 8,
    fontWeight: 700,
    color: "#555",
    backgroundColor: "#f9f9f9"
  },
  value: {
    width: "60%",
    padding: 8,
    color: "#222"
  },
  footer: {
    marginTop: 24,
    fontSize: 8,
    color: "#999",
    textAlign: "center"
  }
})

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount)
}

export function VoucherDocument({ movement }: { movement: MovementIntegrationPayload }) {
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
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{movement.organizationName ?? "Sistema contable PIBT"}</Text>
          <Text style={styles.title}>
            {movement.movementTypeLabel === "INGRESO"
              ? "COMPROBANTE DE INGRESO"
              : "COMPROBANTE DE EGRESO"}
          </Text>
        </View>

        <View style={styles.folioRow}>
          <Text style={styles.folio}>Folio {movement.folio}</Text>
          <Text style={styles.date}>{movement.movementDate}</Text>
        </View>

        <View style={styles.table}>
          {rows.map(([label, value]) => (
            <View style={styles.row} key={label}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Documento generado automáticamente por el sistema contable — no requiere firma.
        </Text>
      </Page>
    </Document>
  )
}
