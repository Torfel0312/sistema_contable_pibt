import { test, expect, type Locator, type Page } from "@playwright/test"
import { login, shot } from "./fixtures/helpers"

const DATE_TRIGGER_RE = /Seleccionar fecha|^\d{2}-\d{2}-\d{4}$/

async function pickTodayIn(page: Page, scope: Page | Locator) {
  const trigger = scope.getByRole("button", { name: DATE_TRIGGER_RE })
  await trigger.click()
  await page.getByRole("button", { name: "Hoy" }).last().click()
  await trigger.click()
}

test.describe("Payroll (Etapa 6, ADMIN only)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin")
  })

  test("page + severance adjustment dialog", async ({ page }) => {
    await page.goto("/payroll", { waitUntil: "networkidle" })
    await shot(page, "06-payroll", "page")

    await page.getByRole("button", { name: "Ajustar reserva" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await shot(page, "06-payroll", "severance-adjust-dialog-empty")
    await pickTodayIn(page, dialog)
    await dialog.locator('input[type="number"]').fill("500000")
    await dialog.getByPlaceholder("Razón del ajuste").fill("Ajuste E2E de prueba")
    await shot(page, "06-payroll", "severance-adjust-dialog-filled")
    await dialog.getByRole("button", { name: "Confirmar ajuste" }).click()
    await page.waitForTimeout(1000)
    await shot(page, "06-payroll", "severance-balance-updated")
  })

  test("register payroll dialog + multi-line form + history", async ({ page }) => {
    await page.goto("/payroll", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Registrar remuneración" }).click()
    const dialog = page.getByRole("dialog")
    await shot(page, "06-payroll", "register-dialog-empty")

    await pickTodayIn(page, dialog.getByTestId("period-date-trigger"))

    // Defaults to 2 pre-filled lines ("Sueldo pastor", "Imposiciones") — no need
    // to click "Agregar otra transferencia" to get a second line anymore.
    const line1 = dialog.getByTestId("payroll-line-0")
    await line1.locator('input[inputmode="numeric"]').fill("800000")
    await pickTodayIn(page, line1)

    const line2 = dialog.getByTestId("payroll-line-1")
    await line2.locator('input[inputmode="numeric"]').fill("150000")
    await pickTodayIn(page, line2)
    await shot(page, "06-payroll", "register-dialog-two-lines")

    // Liquidación is a required upload, but actually completing it needs a real
    // Google Drive service-account key (GOOGLE_APPLICATION_CREDENTIALS) that isn't
    // configured in local/e2e envs — same reason no other spec in this suite
    // exercises a real attachment upload. Cover the validation guard instead of
    // faking a successful upload.
    await dialog.getByRole("button", { name: "Registrar" }).click()
    await expect(dialog.getByText("Debes adjuntar la liquidación")).toBeVisible()
    await shot(page, "06-payroll", "register-dialog-liquidacion-required")
  })
})
