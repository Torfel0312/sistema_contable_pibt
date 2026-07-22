import { test, expect } from "@playwright/test"
import { login, shot, pickToday } from "./fixtures/helpers"

test.describe("Movements (Etapa 1/2)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin")
  })

  test("list page", async ({ page }) => {
    await page.goto("/movements", { waitUntil: "networkidle" })
    await shot(page, "01-movements", "list")
  })

  // "Nuevo Movimiento" on the list page is a plain Link to /movements/new, not a dialog.
  test("Nuevo Movimiento navigates to /movements/new", async ({ page }) => {
    await page.goto("/movements", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Nuevo Movimiento" }).click()
    await expect(page).toHaveURL(/\/movements\/new$/)
  })

  test("new movement full page", async ({ page }) => {
    await page.goto("/movements/new", { waitUntil: "networkidle" })
    await shot(page, "01-movements", "new-page")
  })

  test("capital injection quick-entry", async ({ page }) => {
    await page.goto("/movements/new?capitalInjection=1", { waitUntil: "networkidle" })
    await shot(page, "01-movements", "capital-injection")
  })

  test("movement detail + edit", async ({ page }) => {
    // /movements/new (non-capital-injection) is a 3-step wizard: step 1
    // (type/amount/date) → step 2 (who/payment method/category) → step 3
    // (comments/attachments + submit) — each "Continuar" click runs
    // per-step Zod validation before advancing.
    await page.goto("/movements/new", { waitUntil: "networkidle" })
    await pickToday(page)
    await page.locator('input[inputmode="numeric"]').first().fill("75000")
    await page.getByRole("button", { name: "Continuar" }).click()

    await page.locator("select[name='category_id']").selectOption({ index: 1 })
    await page.getByRole("button", { name: "Continuar" }).click()

    await page.getByRole("button", { name: /Confirmar y Guardar/ }).click()
    await page.waitForURL(/\/movements\/[0-9a-f-]+$/, { timeout: 10_000 })

    await shot(page, "01-movements", "detail")
    await page.goto(`${page.url()}/edit`, { waitUntil: "networkidle" })
    await shot(page, "01-movements", "edit")
  })
})
