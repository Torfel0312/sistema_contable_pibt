import { createMinistry, getMinistryAssignments, assignMinister } from "../ministries"
import { createMinistrySchema } from "@/lib/validators/ministry"

const mockGetCurrentUser = jest.fn()
const mockDb = {}
const mockCreateSupabaseServerClient = jest.fn(() => Promise.resolve(mockDb))
const mockCan = jest.fn()
const mockCreate = jest.fn()
const mockGetAssignments = jest.fn()
const mockAssign = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createSupabaseServerClient: () => mockCreateSupabaseServerClient()
}))

jest.mock("@/lib/permissions/rbac", () => ({
  PERMISSIONS: { MANAGE_MINISTRIES: "MANAGE_MINISTRIES" },
  can: (...args: unknown[]) => mockCan(...args)
}))

jest.mock("@/services/ministries/ministries.service", () => ({
  ministriesService: {
    create: (...args: unknown[]) => mockCreate(...args),
    getAssignments: (...args: unknown[]) => mockGetAssignments(...args),
    assign: (...args: unknown[]) => mockAssign(...args)
  }
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const mockUser = { id: "user-1", permissions: ["MANAGE_MINISTRIES"] }

describe("createMinistry", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockCan.mockReturnValue(false)
    await expect(createMinistry({ name: "Test" })).rejects.toThrow("Sin permisos")
  })

  it("creates ministry and revalidates", async () => {
    const created = { id: "m-1", name: "Test" }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockCreate.mockResolvedValue(created)

    const data = await createMinistry({ name: "Test" })

    expect(mockCreate).toHaveBeenCalledWith(mockDb, { name: "Test" }, mockUser.id)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ministries")
    expect(data).toEqual(created)
  })
})

describe("createMinistrySchema", () => {
  it("requires name", () => {
    const result = createMinistrySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("accepts a valid name", () => {
    const result = createMinistrySchema.safeParse({ name: "Test" })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe("Test")
  })
})

describe("getMinistryAssignments", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when lacks permission", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(false)
    await expect(getMinistryAssignments("m-1")).rejects.toThrow("Sin permisos")
  })

  it("returns assignments", async () => {
    const assignments = [{ id: "a-1" }]
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockGetAssignments.mockResolvedValue(assignments)

    const data = await getMinistryAssignments("m-1")

    expect(mockGetAssignments).toHaveBeenCalledWith(mockDb, "m-1")
    expect(data).toEqual(assignments)
  })
})

describe("assignMinister", () => {
  beforeEach(() => jest.clearAllMocks())

  it("assigns minister and revalidates", async () => {
    const result = { id: "a-2" }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockAssign.mockResolvedValue(result)

    const data = await assignMinister("m-1", { user_id: "u-2" })

    expect(mockAssign).toHaveBeenCalledWith(mockDb, "m-1", { user_id: "u-2" }, mockUser.id)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ministries")
    expect(data).toEqual(result)
  })
})
