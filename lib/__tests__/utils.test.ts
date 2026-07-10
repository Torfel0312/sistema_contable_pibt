import { toDateInput } from "../utils"

describe("toDateInput", () => {
  const originalTz = process.env.TZ

  beforeAll(() => {
    // Force a strongly UTC-offset timezone so a regression to UTC-based date
    // serialization (e.g. `toISOString()`) would visibly roll the date over.
    process.env.TZ = "Pacific/Kiritimati" // UTC+14
  })

  afterAll(() => {
    process.env.TZ = originalTz
  })

  it("returns date-only strings unchanged", () => {
    expect(toDateInput("2026-07-10")).toBe("2026-07-10")
  })

  it("formats a Date using its local date components, not UTC", () => {
    // Regression: this used to go through `toISOString()`, which converts to
    // UTC and rolls back to the previous day in positive-offset timezones.
    const d = new Date(2026, 0, 1, 0, 30) // Jan 1, 2026, 00:30 local
    expect(toDateInput(d)).toBe("2026-01-01")
  })

  it("does not roll over near a local midnight boundary", () => {
    const d = new Date(2026, 11, 31, 23, 45) // Dec 31, 2026, 23:45 local
    expect(toDateInput(d)).toBe("2026-12-31")
  })

  it("pads single-digit month and day", () => {
    const d = new Date(2026, 0, 5)
    expect(toDateInput(d)).toBe("2026-01-05")
  })
})
