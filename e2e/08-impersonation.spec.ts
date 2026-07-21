import { test, expect } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"

test.describe("Admin impersonation", () => {
  // A test failing mid-flow can leave an unexpired session in impersonation_sessions,
  // which blocks every later attempt (impersonationService.start rejects concurrent
  // sessions per admin) — always try to exit so the next test/run starts clean.
  test.afterEach(async ({ page }) => {
    const exitButton = page.getByRole("button", { name: "Salir" })
    if (await exitButton.isVisible().catch(() => false)) {
      await exitButton.click()
    }
  })

  test("admin can impersonate a user from the users page, act with their permissions, and exit", async ({
    page
  }) => {
    await login(page, "admin")
    await page.goto("/users")

    await page.getByText("E2E Bursar").click()
    const dialog = page.getByRole("dialog", { name: "Editar Usuario" })
    await expect(dialog).toBeVisible()
    const impersonateButton = dialog.getByRole("button", { name: "Impersonar" })
    await expect(impersonateButton).toBeVisible()
    await shot(page, "impersonation", "edit-dialog-with-option", { fullPage: false })
    await impersonateButton.click()

    await expect(page.getByText(/Estás viendo la aplicación como/)).toBeVisible({ timeout: 10_000 })
    await shot(page, "impersonation", "active-banner", { fullPage: false })

    // Effective identity is now BURSAR — an ADMIN-only page must be unreachable.
    await page.goto("/users")
    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByRole("button", { name: "Salir" }).click()
    await expect(page.getByText(/Estás viendo la aplicación como/)).toHaveCount(0, { timeout: 10_000 })

    // Back to real ADMIN identity — /users is reachable again.
    await page.goto("/users")
    await expect(page).toHaveURL(/\/users/)
  })
})
