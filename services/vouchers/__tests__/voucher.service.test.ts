type SendCallArgs = {
  to: string
  bcc?: string
  subject: string
  attachments: { filename: string }[]
}

const mockSend = jest.fn<
  Promise<{ data: { id: string } | null; error: { message: string } | null }>,
  [SendCallArgs]
>()
const mockGetAll = jest.fn()

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (args: SendCallArgs) => mockSend(args) }
  }))
}))

jest.mock("@/services/settings/settings.service", () => ({
  settingsService: { getAll: (...args: unknown[]) => mockGetAll(...args) }
}))

const mockMovementRow = {
  id: "mov-1",
  folio_display: "000042",
  movement_date: "2026-05-01",
  movement_type: "INCOME",
  amount: 150000,
  delivered_by: null,
  receipt_email: "donante@example.com",
  notes: null,
  created_at: "2026-05-01T10:00:00Z",
  payment_method_id: null,
  created_by: { full_name: "Marcelo Fuentes", email: "marcelo@example.com" },
  movement_categories: { name: "Diezmos" }
}

const mockSingle = jest.fn()
const mockMaybeSingle = jest.fn()

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "movements") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSingle()
            })
          })
        }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => mockMaybeSingle()
          })
        })
      }
    }
  })
}))

import { renderVoucherPdf, sendVoucherEmail } from "../voucher.service"
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

describe("sendVoucherEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({ data: mockMovementRow, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockGetAll.mockResolvedValue({
      notifications_from_email: "",
      notifications_bcc_email: "",
      tesoreria_notification_email: "",
      voucher_email: "",
      reminder_interval_days: 2
    })
  })

  it("sends the voucher email with the rendered PDF attached", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null })

    const result = await sendVoucherEmail("mov-1", "donante@example.com")

    expect(result).toEqual({ ok: true, mailSent: true })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const call = mockSend.mock.calls[0][0] as SendCallArgs
    expect(call.to).toBe("donante@example.com")
    expect(call.bcc).toBeUndefined()
    expect(call.subject).toContain("000042")
    expect(call.attachments).toEqual([
      expect.objectContaining({ filename: "comprobante-000042.pdf" })
    ])
  })

  it("includes bcc when provided", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null })

    await sendVoucherEmail("mov-1", "donante@example.com", { bcc: "auditoria@example.com" })

    const call = mockSend.mock.calls[0][0] as SendCallArgs
    expect(call.bcc).toBe("auditoria@example.com")
  })

  it("returns ok:false with the error message when Resend fails", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "Resend down" } })

    const result = await sendVoucherEmail("mov-1", "donante@example.com")

    expect(result).toEqual({ ok: false, error: "Resend down" })
  })
})
