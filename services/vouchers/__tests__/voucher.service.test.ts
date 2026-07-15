import { renderVoucherPdf } from "../voucher.service"
import type { MovementIntegrationPayload } from "@/services/google/types"

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

describe("renderVoucherPdf", () => {
  it("resolves to a non-empty Buffer with a valid PDF header", async () => {
    const buffer = await renderVoucherPdf(baseMovement)

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF")
  })
})
