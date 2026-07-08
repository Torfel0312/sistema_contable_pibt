import {
  listInboundEmailRoutes,
  createInboundEmailRoute,
  removeInboundEmailRoute
} from "../inbound-email-routes"

const mockGetCurrentUser = jest.fn()
const mockDb = {}
const mockCreateSupabaseServerClient = jest.fn(() => Promise.resolve(mockDb))
const mockCan = jest.fn()
const mockList = jest.fn()
const mockCreate = jest.fn()
const mockRemove = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createSupabaseServerClient: () => mockCreateSupabaseServerClient()
}))

jest.mock("@/lib/permissions/rbac", () => ({
  PERMISSIONS: { MANAGE_SETTINGS: "MANAGE_SETTINGS" },
  can: (...args: unknown[]) => mockCan(...args)
}))

jest.mock("@/services/email/inbound-routes.service", () => ({
  inboundRoutesService: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    remove: (...args: unknown[]) => mockRemove(...args)
  }
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const mockUser = { id: "user-1", permissions: ["MANAGE_SETTINGS"] }

describe("inbound email route actions", () => {
  beforeEach(() => jest.clearAllMocks())

  it("listInboundEmailRoutes throws when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockCan.mockReturnValue(false)
    await expect(listInboundEmailRoutes()).rejects.toThrow("Sin permisos")
  })

  it("listInboundEmailRoutes returns service data", async () => {
    const routes = [{ id: "r-1" }]
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockList.mockResolvedValue(routes)

    const data = await listInboundEmailRoutes()

    expect(mockList).toHaveBeenCalledWith(mockDb)
    expect(data).toEqual(routes)
  })

  it("createInboundEmailRoute creates and revalidates", async () => {
    const created = { id: "r-2", local_part: "tesoreria", user_id: "u-1" }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockCreate.mockResolvedValue(created)

    const data = await createInboundEmailRoute({ local_part: "tesoreria", user_id: "u-1" })

    expect(mockCreate).toHaveBeenCalledWith(
      mockDb,
      { local_part: "tesoreria", user_id: "u-1" },
      mockUser.id
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings")
    expect(data).toEqual(created)
  })

  it("removeInboundEmailRoute removes and revalidates", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockRemove.mockResolvedValue(undefined)

    await removeInboundEmailRoute("r-2")

    expect(mockRemove).toHaveBeenCalledWith(mockDb, "r-2", mockUser.id)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings")
  })

  it("removeInboundEmailRoute throws when caller lacks permission", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(false)
    await expect(removeInboundEmailRoute("r-2")).rejects.toThrow("Sin permisos")
    expect(mockRemove).not.toHaveBeenCalled()
  })
})
