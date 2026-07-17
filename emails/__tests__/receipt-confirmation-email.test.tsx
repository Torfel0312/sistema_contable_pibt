import { renderToStaticMarkup } from "react-dom/server"

import { ReceiptConfirmationEmail } from "../receipt-confirmation-email"
import type { MovementIntegrationPayload } from "@/services/google/types"

const render = (el: React.ReactElement) => renderToStaticMarkup(el)

const baseMovement: MovementIntegrationPayload = {
  movementId: "mov-1",
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
  receiptEmail: "donante@example.com",
  notes: null
}

describe("ReceiptConfirmationEmail", () => {
  it("renders without throwing", () => {
    expect(() => render(ReceiptConfirmationEmail({ movement: baseMovement }))).not.toThrow()
  })

  it("includes category in output", () => {
    const html = render(ReceiptConfirmationEmail({ movement: baseMovement }))
    expect(html).toContain("Diezmos")
  })

  it("formats amount as CLP currency", () => {
    const html = render(ReceiptConfirmationEmail({ movement: baseMovement }))
    expect(html).toContain("150.000")
  })

  it("includes preview text with category", () => {
    const html = render(ReceiptConfirmationEmail({ movement: baseMovement }))
    expect(html).toContain("Diezmos")
  })

  it("mentions the attached PDF comprobante", () => {
    const html = render(ReceiptConfirmationEmail({ movement: baseMovement }))
    expect(html).toContain("comprobante")
  })
})
