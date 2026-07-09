/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

const mockVerify = jest.fn()
const mockForward = jest.fn()
const mockFindByLocalPart = jest.fn()

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    webhooks: { verify: mockVerify },
    emails: { receiving: { forward: mockForward } }
  }))
}))

jest.mock("@/services/email/inbound-routes.service", () => ({
  inboundRoutesService: { findByLocalPart: (...args: unknown[]) => mockFindByLocalPart(...args) }
}))

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({})
}))

jest.mock("@/services/email/resend.service", () => ({
  FROM_EMAIL: "Sistema contable PIBT <hola@pibtalcahuano.com>"
}))

import { POST } from "../route"

function makeRequest(body: string) {
  return new NextRequest("https://tesoreria.pibtalcahuano.com/api/webhooks/resend-inbound", {
    method: "POST",
    headers: new Headers({
      "svix-id": "msg_1",
      "svix-timestamp": "1234567890",
      "svix-signature": "v1,abc"
    }),
    body
  })
}

describe("POST /api/webhooks/resend-inbound", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when signature verification fails", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("invalid signature")
    })
    const res = await POST(makeRequest("{}"))
    expect(res.status).toBe(401)
    expect(mockFindByLocalPart).not.toHaveBeenCalled()
  })

  it("acks 200 and skips non-email.received events", async () => {
    mockVerify.mockReturnValue({ type: "email.sent", data: {} })
    const res = await POST(makeRequest("{}"))
    expect(res.status).toBe(200)
    expect(mockFindByLocalPart).not.toHaveBeenCalled()
  })

  it("acks 200 and does not forward when no route matches", async () => {
    mockVerify.mockReturnValue({
      type: "email.received",
      data: { email_id: "email-1", to: ["tesoreria@pibtalcahuano.com"], from: "ext@example.com" }
    })
    mockFindByLocalPart.mockResolvedValue([])
    const res = await POST(makeRequest("{}"))
    expect(res.status).toBe(200)
    expect(mockFindByLocalPart).toHaveBeenCalledWith({}, "tesoreria")
    expect(mockForward).not.toHaveBeenCalled()
  })

  it("forwards to all matched user emails on a match", async () => {
    mockVerify.mockReturnValue({
      type: "email.received",
      data: { email_id: "email-1", to: ["tesoreria@pibtalcahuano.com"], from: "ext@example.com" }
    })
    mockFindByLocalPart.mockResolvedValue(["ana@example.com", "beto@example.com"])
    mockForward.mockResolvedValue({ data: { id: "fwd-1" }, error: null })

    const res = await POST(makeRequest("{}"))

    expect(res.status).toBe(200)
    expect(mockForward).toHaveBeenCalledWith({
      emailId: "email-1",
      to: ["ana@example.com", "beto@example.com"],
      from: "Sistema contable PIBT <hola@pibtalcahuano.com>"
    })
  })

  it("forwards to matched user when the address is in cc rather than to", async () => {
    mockVerify.mockReturnValue({
      type: "email.received",
      data: {
        email_id: "email-2",
        to: ["someone-else@example.com"],
        cc: ["tesoreria@pibtalcahuano.com"],
        bcc: [],
        from: "ext@example.com"
      }
    })
    mockFindByLocalPart.mockResolvedValue(["ana@example.com"])
    mockForward.mockResolvedValue({ data: { id: "fwd-2" }, error: null })

    const res = await POST(makeRequest("{}"))

    expect(res.status).toBe(200)
    expect(mockFindByLocalPart).toHaveBeenCalledWith({}, "tesoreria")
    expect(mockForward).toHaveBeenCalledWith({
      emailId: "email-2",
      to: ["ana@example.com"],
      from: "Sistema contable PIBT <hola@pibtalcahuano.com>"
    })
  })

  it("returns 200 even when the service layer throws", async () => {
    mockVerify.mockReturnValue({
      type: "email.received",
      data: { email_id: "email-1", to: ["tesoreria@pibtalcahuano.com"], from: "ext@example.com" }
    })
    mockFindByLocalPart.mockRejectedValue(new Error("db unreachable"))

    const res = await POST(makeRequest("{}"))

    expect(res.status).toBe(200)
  })
})
