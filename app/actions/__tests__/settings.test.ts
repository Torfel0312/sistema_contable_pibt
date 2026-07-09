import { updateSettings } from "../settings"

const mockGetCurrentUser = jest.fn()
const mockDb = {}
const mockCreateSupabaseServerClient = jest.fn(() => Promise.resolve(mockDb))
const mockCan = jest.fn()
const mockSettingsUpdate = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createSupabaseServerClient: () => mockCreateSupabaseServerClient()
}))

jest.mock("@/lib/permissions/rbac", () => ({
  PERMISSIONS: { MANAGE_SETTINGS: "MANAGE_SETTINGS" },
  can: (...args: unknown[]) => mockCan(...args)
}))

jest.mock("@/services/settings/settings.service", () => ({
  settingsService: { update: (...args: unknown[]) => mockSettingsUpdate(...args) }
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const input = {
  tesoreria_notification_email: "t@example.com",
  voucher_email: "v@example.com",
  reminder_interval_days: 3
}

const mockUser = { id: "user-1", permissions: ["MANAGE_SETTINGS"] }

describe("updateSettings", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockCan.mockReturnValue(false)
    await expect(updateSettings(input)).rejects.toThrow("Sin permisos")
  })

  it("throws when user lacks permission", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(false)
    await expect(updateSettings(input)).rejects.toThrow("Sin permisos")
  })

  it("calls service and revalidates on success", async () => {
    const result = { ...input }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockSettingsUpdate.mockResolvedValue(result)

    const data = await updateSettings(input)

    expect(mockSettingsUpdate).toHaveBeenCalledWith(mockDb, input, mockUser.id)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/general")
    expect(data).toEqual(result)
  })
})
