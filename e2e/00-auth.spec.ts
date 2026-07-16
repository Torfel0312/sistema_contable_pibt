import { test, expect } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"
import { USERS } from "./fixtures/users"

test.describe("Auth", () => {
  test("login page", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible()
    await shot(page, "00-auth", "login-page")
  })

  for (const key of Object.keys(USERS) as (keyof typeof USERS)[]) {
    test(`login as ${key}`, async ({ page }) => {
      await login(page, key)
      await expect(page).toHaveURL(/\/dashboard/)
    })
  }
})
