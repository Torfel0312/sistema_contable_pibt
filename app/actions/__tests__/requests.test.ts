import { createRequest, reviewRequest, addComment } from "../requests"

const mockGetCurrentUser = jest.fn()
const mockDb = {}
const mockCreateSupabaseServerClient = jest.fn(() => Promise.resolve(mockDb))
const mockCan = jest.fn()
const mockGetMinistryForUser = jest.fn()
const mockCreate = jest.fn()
const mockReview = jest.fn()
const mockRegisterTransfer = jest.fn()
const mockAddComment = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createSupabaseServerClient: () => mockCreateSupabaseServerClient()
}))

const mockCanAccessWorkflow = jest.fn()

jest.mock("@/lib/permissions/rbac", () => ({
  PERMISSIONS: {
    SUBMIT_INTENTIONS: "SUBMIT_INTENTIONS",
    REVIEW_INTENTIONS: "REVIEW_INTENTIONS",
    VIEW_WORKFLOW: "VIEW_WORKFLOW"
  },
  can: (...args: unknown[]) => mockCan(...args),
  canAccessWorkflow: (...args: unknown[]) => mockCanAccessWorkflow(...args)
}))

jest.mock("@/services/intentions/intentions.service", () => ({
  intentionsService: {
    create: (...args: unknown[]) => mockCreate(...args),
    review: (...args: unknown[]) => mockReview(...args),
    registerTransfer: (...args: unknown[]) => mockRegisterTransfer(...args),
    addComment: (...args: unknown[]) => mockAddComment(...args)
  }
}))

jest.mock("@/services/ministries/ministries.service", () => ({
  ministriesService: {
    getMinistryForUser: (...args: unknown[]) => mockGetMinistryForUser(...args)
  }
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const mockUser = {
  id: "user-1",
  permissions: ["SUBMIT_INTENTIONS", "REVIEW_INTENTIONS", "VIEW_WORKFLOW"]
}
const requestInput = {
  amount: 5000,
  description: "Test request long enough"
}

describe("createRequest", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    mockCan.mockReturnValue(false)
    await expect(createRequest(requestInput)).rejects.toThrow("Sin permisos")
  })

  it("throws when user has no ministry assignment", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockGetMinistryForUser.mockResolvedValue(null)
    await expect(createRequest(requestInput)).rejects.toThrow("No tienes un ministerio asignado")
  })

  it("creates request with ministry_id and revalidates", async () => {
    const assignment = { ministry_id: "m-1" }
    const created = { id: "req-1", ...requestInput }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockGetMinistryForUser.mockResolvedValue(assignment)
    mockCreate.mockResolvedValue(created)

    const data = await createRequest(requestInput)

    expect(mockCreate).toHaveBeenCalledWith(mockDb, requestInput, mockUser.id, "m-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/requests")
    expect(data).toEqual(created)
  })
})

describe("reviewRequest", () => {
  beforeEach(() => jest.clearAllMocks())

  it("throws when lacks REVIEW_INTENTIONS permission", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(false)
    await expect(reviewRequest("req-1", { action: "APPROVED", message: "ok" })).rejects.toThrow(
      "Sin permisos"
    )
  })

  it("returns alreadyActioned:true without revalidating", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockReview.mockResolvedValue({ alreadyActioned: true })

    const result = await reviewRequest("req-1", { action: "APPROVED", message: "ok" })

    expect(result).toEqual({ alreadyActioned: true })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("revalidates on successful review", async () => {
    const reviewResult = { alreadyActioned: false, data: { id: "req-1" } }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCan.mockReturnValue(true)
    mockReview.mockResolvedValue(reviewResult)

    const result = await reviewRequest("req-1", { action: "APPROVED", message: "ok" })

    expect(result).toEqual(reviewResult)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/requests/req-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/requests")
  })
})

describe("addComment", () => {
  beforeEach(() => jest.clearAllMocks())

  it("adds comment and revalidates", async () => {
    const comment = { id: "c-1", body: "ok" }
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCanAccessWorkflow.mockReturnValue(true)
    mockAddComment.mockResolvedValue(comment)

    const data = await addComment("req-1", { message: "ok" })

    expect(mockAddComment).toHaveBeenCalledWith(
      mockDb,
      "req-1",
      "INTENTION",
      { message: "ok" },
      mockUser.id
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/requests/req-1")
    expect(data).toEqual(comment)
  })
})
