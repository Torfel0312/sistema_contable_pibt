import { test, expect } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"

test.describe("Users / Audit / Profile / Voucher Book / Invoices (ADMIN)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin")
  })

  test("users page + invite dialog", async ({ page }) => {
    await page.goto("/users", { waitUntil: "networkidle" })
    await shot(page, "03-admin-misc", "users")

    await page.getByRole("button", { name: "Invitar" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await shot(page, "03-admin-misc", "users-invite-dialog")
  })

  test("audit log page", async ({ page }) => {
    await page.goto("/audit", { waitUntil: "networkidle" })
    await shot(page, "03-admin-misc", "audit")
  })

  test("profile page", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" })
    await shot(page, "03-admin-misc", "profile")
  })

  test("voucher book (talonario unificado)", async ({ page }) => {
    await page.goto("/voucher-book", { waitUntil: "networkidle" })
    await shot(page, "03-admin-misc", "voucher-book")
  })

  test("invoices / Rendición de Boletas page + new dialog", async ({ page }) => {
    await page.goto("/settlements", { waitUntil: "networkidle" })
    await shot(page, "03-admin-misc", "invoices-boletas")

    await page.getByRole("button", { name: "Nueva rendición" }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await shot(page, "03-admin-misc", "invoices-new-dialog")
  })
})
