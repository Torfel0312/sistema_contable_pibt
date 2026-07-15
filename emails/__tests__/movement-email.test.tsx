import { renderToStaticMarkup } from "react-dom/server"

import { MovementEmail } from "../movement-email"
import type { MovementIntegrationPayload } from "@/services/google/types"

const render = (el: React.ReactElement) => renderToStaticMarkup(el)

const baseMovement: MovementIntegrationPayload = {
  movementId: "mov-1",
  folio: "000042",
  movementDate: "2026-05-01",
  movementTypeLabel: "INGRESO",
  amount: 150000,
  category: "Diezmos",
  registeredBy: "Marcelo Fuentes",
  registeredEmail: "marcelo@example.com",
  registeredAt: "2026-05-01T10:00:00Z",
  user: "Marcelo Fuentes",
  deliveredBy: null,
  paymentMethodLabel: null,
  receiptEmail: null,
  notes: null
}

describe("MovementEmail", () => {
  it("renders without throwing", () => {
    expect(() => render(MovementEmail({ movement: baseMovement }))).not.toThrow()
  })

  it("includes folio and category in output", () => {
    const html = render(MovementEmail({ movement: baseMovement }))
    expect(html).toContain("000042")
    expect(html).toContain("Diezmos")
  })

  it("formats amount as CLP currency", () => {
    const html = render(MovementEmail({ movement: baseMovement }))
    expect(html).toContain("150.000")
  })

  it("includes preview text with folio", () => {
    const html = render(MovementEmail({ movement: baseMovement }))
    expect(html).toContain("Folio 000042")
  })

  it("omits optional fields when null", () => {
    const html = render(MovementEmail({ movement: baseMovement }))
    expect(html).not.toContain("Entregado por")
    expect(html).not.toContain("Entregado a")
    expect(html).not.toContain("Observaciones")
    expect(html).not.toContain("Comprobante enviado a")
  })

  it("shows optional fields when present, with direction-aware label", () => {
    const movement = {
      ...baseMovement,
      deliveredBy: "Juan Pérez",
      notes: "Nota especial",
      receiptEmail: "donante@example.com"
    }
    const html = render(MovementEmail({ movement }))
    expect(html).toContain("Entregado por")
    expect(html).toContain("Juan Pérez")
    expect(html).toContain("Nota especial")
    expect(html).toContain("Comprobante enviado a")
    expect(html).toContain("donante@example.com")
  })

  it("uses 'Entregado a' label for EXPENSE movements", () => {
    const movement = {
      ...baseMovement,
      movementTypeLabel: "EGRESO" as const,
      deliveredBy: "Ministerio Jóvenes"
    }
    const html = render(MovementEmail({ movement }))
    expect(html).toContain("Entregado a")
    expect(html).not.toContain("Entregado por")
  })
})
