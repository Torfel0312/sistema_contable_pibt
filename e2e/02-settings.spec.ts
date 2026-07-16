import { test, expect } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"

test.describe("Settings / Admin (ADMIN)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin")
  })

  test("general settings", async ({ page }) => {
    await page.goto("/settings/general", { waitUntil: "networkidle" })
    await shot(page, "02-settings", "general")
  })

  test("categories page + new category dialog", async ({ page }) => {
    await page.goto("/settings/categories", { waitUntil: "networkidle" })
    await shot(page, "02-settings", "categories")

    await page.getByRole("button", { name: "Nueva categoría" }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await shot(page, "02-settings", "categories-new-dialog")
  })

  test("payment methods page + new dialog", async ({ page }) => {
    await page.goto("/settings/payment-methods", { waitUntil: "networkidle" })
    await shot(page, "02-settings", "payment-methods")

    await page.getByRole("button", { name: "Nuevo medio de pago" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await shot(page, "02-settings", "payment-methods-new-dialog")
  })

  test("permissions page", async ({ page }) => {
    await page.goto("/settings/permissions", { waitUntil: "networkidle" })
    await shot(page, "02-settings", "permissions")
  })

  test("inbound email routes page", async ({ page }) => {
    await page.goto("/settings/inbound-email", { waitUntil: "networkidle" })
    await shot(page, "02-settings", "inbound-email")
  })
})
