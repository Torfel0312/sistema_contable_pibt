import { createMovement, updateMovement, cancelMovement, regeneratePdf } from "../movements"

const mockGetCurrentUser = jest.fn()
const mockDb = {}
const mockCreateSupabaseServerClient = jest.fn(() => Promise.resolve(mockDb))
const mockCan = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockCancel = jest.fn()
const mockProcessIntegrations = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createSupabaseServerClient: () => mockCreateSupabaseServerClient()
}))

jest.mock("@/lib/permissions/rbac", () => ({
  PERMISSIONS: { CREATE_MOVEMENT: "CREATE_MOVEMENT" },
  can: (...args: unknown[]) => mockCan(...args)
}))

jest.mock("@/services/movements/movements.service", () => ({
  movementsService: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    cancel: (...args: unknown[]) => mockCancel(...args)
  }
}))

jest.mock("@/services/google/movement-postprocess", () => ({
  processMovementIntegrations: (...args: unknown[]) => mockProcessIntegrations(...args)
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

jest.mock("next/server", () => ({
  after: (cb: () => Promise<void> | void) => {
    void Promise.resolve().then(cb)
  }
}))

const mockUser = { id: "user-1", permissions: ["CREATE_MOVEMENT"] }
const movementInput = {
  movement_type: "EXPENSE" as const,
  movement_date: "2026-05-01",
  amount: 10000,
  category: "SUPPLIES",
  delivered_by: null,
  receipt_email: null,
  payment_method_id: null,
  notes: null,
  attachments: []
}

describe("createMovement", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockCan.mockReturnValue(false)
    await expect(createMovement(movementInput)).rejects.toThrow("Sin permisos")
  })

  it("creates movement, fires integrations, revalidates", async () => {
    const created = { id: "mv-1", ...movementInput }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockCreate.mockResolvedValue(created)
    mockProcessIntegrations.mockResolvedValue(undefined)

    const data = await createMovement(movementInput)

    expect(mockCreate).toHaveBeenCalledWith(mockDb, movementInput, mockUser.id)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/movements")
    expect(data).toEqual(created)
  })
})

describe("updateMovement", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when lacks permission", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(false)
    await expect(updateMovement("mv-1", movementInput)).rejects.toThrow("Sin permisos")
  })

  it("updates movement with id merged, revalidates both paths", async () => {
    const updated = { id: "mv-1", ...movementInput }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockUpdate.mockResolvedValue(updated)
    mockProcessIntegrations.mockResolvedValue(undefined)

    const data = await updateMovement("mv-1", movementInput)

    expect(mockUpdate).toHaveBeenCalledWith(
      mockDb,
      "mv-1",
      { ...movementInput, id: "mv-1" },
      mockUser.id
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/movements/mv-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/movements")
    expect(data).toEqual(updated)
  })
})

describe("cancelMovement", () => {
  beforeEach(() => jest.clearAllMocks())

  it("cancels movement and revalidates", async () => {
    const cancelled = { id: "mv-1", status: "CANCELLED" }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockCancel.mockResolvedValue(cancelled)
    mockProcessIntegrations.mockResolvedValue(undefined)

    const data = await cancelMovement("mv-1", { cancellation_reason: "Test" })

    expect(mockCancel).toHaveBeenCalledWith(
      mockDb,
      "mv-1",
      { cancellation_reason: "Test" },
      mockUser.id
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/movements/mv-1")
    expect(data).toEqual(cancelled)
  })
})

describe("regeneratePdf", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockCan.mockReturnValue(false)
    await expect(regeneratePdf("mv-1")).rejects.toThrow("Sin permisos")
  })

  it("fires integrations and revalidates", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockProcessIntegrations.mockResolvedValue(undefined)

    await regeneratePdf("mv-1")

    expect(mockProcessIntegrations).toHaveBeenCalledWith("mv-1", mockUser.id)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/movements/mv-1")
  })
})
