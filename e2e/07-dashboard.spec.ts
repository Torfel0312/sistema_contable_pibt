import { test, expect } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"
import { USERS } from "./fixtures/users"

test.describe("Dashboard (Etapa 8 widgets, all roles)", () => {
  for (const key of Object.keys(USERS) as (keyof typeof USERS)[]) {
    test(`dashboard as ${key}`, async ({ page }) => {
      await login(page, key)
      await shot(page, "07-dashboard", key)
    })
  }

  test("finance widgets visible only for ADMIN/BURSAR/FINANCE", async ({ page }) => {
    await login(page, "admin")
    await expect(page.getByText("Reserva de indemnización")).toBeVisible()
    await expect(page.getByText("Remanente por ministerio")).toBeVisible()
  })

  test("finance widgets hidden for MINISTER", async ({ page }) => {
    await login(page, "minister")
    await expect(page.getByText("Reserva de indemnización")).not.toBeVisible()
    await expect(page.getByText("Remanente por ministerio")).not.toBeVisible()
  })
})
