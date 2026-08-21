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

  test("page", async ({ page }) => {
    await page.goto("/payroll", { waitUntil: "networkidle" })
    await shot(page, "06-payroll", "page")
  })

  test("register payroll dialog + multi-line form + severance reserve + history", async ({
    page
  }) => {
    await page.goto("/payroll", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Registrar remuneración" }).click()
    const dialog = page.getByRole("dialog")
    await shot(page, "06-payroll", "register-dialog-empty")

    // Período (mes/año) now defaults to the current month via two selects
    // instead of a DatePicker — nothing to interact with to accept the default.

    await dialog.getByTestId("severance-reserve-input").fill("150000")

    // Defaults to 2 pre-filled lines ("Sueldo pastor", "Imposiciones") — no need
    // to click "Agregar otra transferencia" to get a second line anymore.
    const line1 = dialog.getByTestId("payroll-line-0")
    await line1.locator('input[inputmode="numeric"]').fill("800000")
    await pickTodayIn(page, line1)

    const line2 = dialog.getByTestId("payroll-line-1")
    await line2.locator('input[inputmode="numeric"]').fill("150000")
    await pickTodayIn(page, line2)
    await shot(page, "06-payroll", "register-dialog-two-lines")

    // Liquidación is a required upload. This test covers the validation guard
    // (no file selected) rather than a real upload — see 05-requests.spec.ts
    // for a spec that exercises a real Supabase Storage upload.
    await dialog.getByRole("button", { name: "Registrar remuneración" }).click()
    await expect(dialog.getByText("Debes adjuntar la liquidación")).toBeVisible()
    await shot(page, "06-payroll", "register-dialog-liquidacion-required")
  })
})
