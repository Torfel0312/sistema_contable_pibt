import { activateAccount, sendForgotPassword } from "../auth"

const mockGetUser = jest.fn()
const mockAdminAuthListUsers = jest.fn()
const mockAdminAuthGenerateLink = jest.fn()
const mockAdminUsersUpdate = jest.fn()
const mockSendForgotPasswordEmail = jest.fn()
const mockWrapAuthLink = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => ({
    auth: { getUser: () => mockGetUser() }
  }))
}))

const mockFromChain = () => ({
  update: () => ({ eq: mockAdminUsersUpdate })
})

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    from: mockFromChain,
    auth: {
      admin: {
        listUsers: () => mockAdminAuthListUsers(),
        generateLink: (...args: unknown[]) => mockAdminAuthGenerateLink(...args)
      }
    }
  }))
}))

jest.mock("@/services/email/resend.service", () => ({
  sendForgotPasswordEmail: (...args: unknown[]) => mockSendForgotPasswordEmail(...args)
}))

jest.mock("@/services/auth/link-wrapper", () => ({
  wrapAuthLink: (link: string) => mockWrapAuthLink(link)
}))

jest.mock("@/lib/utils", () => ({
  getSiteUrl: () => "https://example.com"
}))

describe("activateAccount", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(activateAccount()).rejects.toThrow("No autenticado")
  })

  it("updates user status to ACTIVE", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } })
    mockAdminUsersUpdate.mockResolvedValue({ data: {}, error: null })

    await expect(activateAccount()).resolves.not.toThrow()
  })
})

describe("sendForgotPassword", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns silently when email not found", async () => {
    mockAdminAuthListUsers.mockResolvedValue({ data: { users: [] } })
    await expect(sendForgotPassword("unknown@example.com")).resolves.not.toThrow()
    expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled()
  })

  it("returns silently when user is INACTIVE", async () => {
    const authUser = { id: "u-1", email: "test@example.com" }
    mockAdminAuthListUsers.mockResolvedValue({ data: { users: [authUser] } })

    const mockFromChainLocal = () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { status: "INACTIVE" } }) })
      })
    })
    const { createSupabaseAdminClient } = jest.requireMock("@/lib/supabase/admin") as {
      createSupabaseAdminClient: jest.Mock
    }
    createSupabaseAdminClient.mockReturnValueOnce({
      from: mockFromChainLocal,
      auth: { admin: { listUsers: () => mockAdminAuthListUsers() } }
    })

    await expect(sendForgotPassword("test@example.com")).resolves.not.toThrow()
    expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled()
  })

  it("sends recovery email when user is valid", async () => {
    const authUser = { id: "u-1", email: "test@example.com" }
    mockAdminAuthListUsers.mockResolvedValue({ data: { users: [authUser] } })
    mockAdminAuthGenerateLink.mockResolvedValue({
      data: { properties: { action_link: "https://supabase/link" } },
      error: null
    })
    mockWrapAuthLink.mockReturnValue("https://example.com/wrapped")
    mockSendForgotPasswordEmail.mockResolvedValue(undefined)

    const mockFromFull = () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { status: "ACTIVE" } }) })
      }),
      update: () => ({ eq: () => Promise.resolve({}) })
    })
    const { createSupabaseAdminClient } = jest.requireMock("@/lib/supabase/admin") as {
      createSupabaseAdminClient: jest.Mock
    }
    createSupabaseAdminClient.mockReturnValueOnce({
      from: mockFromFull,
      auth: {
        admin: {
          listUsers: () => mockAdminAuthListUsers(),
          generateLink: (...args: unknown[]) => mockAdminAuthGenerateLink(...args)
        }
      }
    })

    await sendForgotPassword("test@example.com")

    expect(mockSendForgotPasswordEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      action_link: "https://example.com/wrapped"
    })
  })
})
