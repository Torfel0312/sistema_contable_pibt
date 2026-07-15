import { emailVoucher } from "../vouchers"

const mockGetCurrentUser = jest.fn()
const mockCan = jest.fn()
const mockSendVoucherEmail = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => mockGetCurrentUser()
}))

jest.mock("@/lib/permissions/rbac", () => ({
  PERMISSIONS: { CREATE_MOVEMENT: "CREATE_MOVEMENT" },
  can: (...args: unknown[]) => mockCan(...args)
}))

jest.mock("@/services/vouchers/voucher.service", () => ({
  sendVoucherEmail: (...args: unknown[]) => mockSendVoucherEmail(...args)
}))

const mockUser = { id: "user-1", permissions: ["CREATE_MOVEMENT"] }

describe("emailVoucher", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns an error when the user lacks permission", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(false)

    const result = await emailVoucher("mv-1", "donante@example.com")

    expect(result).toEqual({ error: "Sin permisos para enviar comprobantes" })
    expect(mockSendVoucherEmail).not.toHaveBeenCalled()
  })

  it("sends the voucher without a bcc and returns ok:true on success", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockSendVoucherEmail.mockResolvedValue({ ok: true, mailSent: true })

    const result = await emailVoucher("mv-1", "donante@example.com")

    expect(mockSendVoucherEmail).toHaveBeenCalledWith("mv-1", "donante@example.com")
    expect(result).toEqual({ ok: true })
  })

  it("maps a failed send into an error result", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockSendVoucherEmail.mockResolvedValue({ ok: false, error: "Resend down" })

    const result = await emailVoucher("mv-1", "donante@example.com")

    expect(result).toEqual({ error: "Resend down" })
  })
})
