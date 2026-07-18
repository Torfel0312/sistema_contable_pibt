import { test, expect } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"

test.describe("Admin impersonation", () => {
  // A test failing mid-flow can leave an unexpired session in impersonation_sessions,
  // which blocks every later attempt (impersonationService.start rejects concurrent
  // sessions per admin) — always try to exit so the next test/run starts clean.
  test.afterEach(async ({ page }) => {
    const exitButton = page.getByRole("button", { name: "Salir de suplantación" })
    if (await exitButton.isVisible().catch(() => false)) {
      await exitButton.click()
    }
  })

  test("admin can impersonate a user, act with their permissions, and exit", async ({ page }) => {
    await login(page, "admin")

    await page.getByRole("button", { name: /e2e admin/i }).click()
    const impersonateItem = page.getByText("Suplantar usuario...")
    await expect(impersonateItem).toBeVisible()
    // fullPage screenshots scroll the page, which dismisses this open dropdown
    // (see e2e/fixtures/helpers.ts's own note on Popover dismiss quirks) — use a
    // fixed-viewport shot here instead.
    await shot(page, "impersonation", "nav-menu-with-option", { fullPage: false })
    await impersonateItem.click()

    const dialog = page.getByRole("dialog", { name: "Suplantar usuario" })
    await expect(dialog).toBeVisible()
    await dialog.locator("select").selectOption({ label: "E2E Bursar — Tesorero" })
    await shot(page, "impersonation", "picker-dialog", { fullPage: false })
    await dialog.getByRole("button", { name: "Suplantar" }).click()

    await expect(page.getByText(/Viendo como/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/suplantado por/)).toBeVisible()
    await shot(page, "impersonation", "active-banner", { fullPage: false })

    // Effective identity is now BURSAR — an ADMIN-only page must be unreachable.
    await page.goto("/users")
    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByRole("button", { name: "Salir de suplantación" }).click()
    await expect(page.getByText(/Viendo como/)).toHaveCount(0, { timeout: 10_000 })

    // Back to real ADMIN identity — /users is reachable again.
    await page.goto("/users")
    await expect(page).toHaveURL(/\/users/)

    await page.goto("/audit")
    await expect(page.getByText("Sesión de suplantación iniciada").first()).toBeVisible()
    await expect(page.getByText("Sesión de suplantación finalizada").first()).toBeVisible()
    await shot(page, "impersonation", "audit-trail", { fullPage: false })
  })

  test("cannot start a second impersonation session while one is active", async ({ page }) => {
    await login(page, "admin")
    await page.getByRole("button", { name: /e2e admin/i }).click()
    const impersonateItem = page.getByText("Suplantar usuario...")
    await expect(impersonateItem).toBeVisible()
    await impersonateItem.click()
    const dialog = page.getByRole("dialog", { name: "Suplantar usuario" })
    await dialog.locator("select").selectOption({ label: "E2E Minister — Encargado de Ministerio" })
    await dialog.getByRole("button", { name: "Suplantar" }).click()
    await expect(page.getByText(/Viendo como/)).toBeVisible({ timeout: 10_000 })

    // The nav menu no longer offers the option while already impersonating.
    await page.getByRole("button", { name: /e2e minister/i }).click()
    await expect(page.getByText("Suplantar usuario...")).toHaveCount(0)
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Salir de suplantación" }).click()
    await expect(page.getByText(/Viendo como/)).toHaveCount(0, { timeout: 10_000 })
  })
})
