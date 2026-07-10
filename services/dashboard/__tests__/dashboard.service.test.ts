import { dashboardService } from "../dashboard.service"

const mockRpc = jest.fn()
const mockLimit = jest.fn()

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({
              limit: (...args: unknown[]) => mockLimit(...args)
            })
          })
        })
      })
    })
  })
}))

const emptySummary = {
  totalIncome: 0,
  totalExpense: 0,
  movementCount: 0,
  series: [],
  categoryBreakdown: []
}

describe("dashboardService.getSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: emptySummary, error: null })
    mockLimit.mockResolvedValue({ data: [], error: null })
  })

  it("passes undefined to the RPC when from/to are empty strings", async () => {
    // Regression: `?from=&to=` from the dashboard filter form used to reach
    // Postgres as empty strings, failing to cast to `date` (error 22007).
    await dashboardService.getSummary({ from: "", to: "" })

    expect(mockRpc).toHaveBeenCalledWith("get_dashboard_summary", {
      p_from: undefined,
      p_to: undefined
    })
  })

  it("passes undefined to the RPC when from/to are omitted", async () => {
    await dashboardService.getSummary()

    expect(mockRpc).toHaveBeenCalledWith("get_dashboard_summary", {
      p_from: undefined,
      p_to: undefined
    })
  })

  it("forwards real from/to date strings to the RPC", async () => {
    await dashboardService.getSummary({ from: "2026-07-01", to: "2026-08-15" })

    expect(mockRpc).toHaveBeenCalledWith("get_dashboard_summary", {
      p_from: "2026-07-01",
      p_to: "2026-08-15"
    })
  })

  it("throws when the RPC returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("boom") })

    await expect(dashboardService.getSummary()).rejects.toThrow("boom")
  })

  it("maps summary totals and current balance", async () => {
    mockRpc.mockResolvedValue({
      data: {
        totalIncome: 15000,
        totalExpense: 5000,
        movementCount: 3,
        series: [{ month: "2026-07", income: 15000, expense: 5000 }],
        categoryBreakdown: [{ category: "Diezmo", total: 15000 }]
      },
      error: null
    })

    const result = await dashboardService.getSummary()

    expect(result.kpis).toEqual({
      totalIncome: 15000,
      totalExpense: 5000,
      currentBalance: 10000,
      movementCount: 3
    })
    expect(result.categoryBreakdown).toEqual([{ category: "Diezmo", total: 15000 }])
  })
})
