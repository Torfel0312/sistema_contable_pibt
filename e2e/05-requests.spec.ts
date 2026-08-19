import { test, expect, chromium, type Page } from "@playwright/test"
import { shot, pickToday } from "./fixtures/helpers"
import { USERS } from "./fixtures/users"

test.setTimeout(180_000)

async function login(page: Page, userKey: keyof typeof USERS) {
  const user = USERS[userKey]
  await page.goto("/", { waitUntil: "networkidle" })
  const submit = page.getByRole("button", { name: "Ingresar" })
  await submit.waitFor({ state: "visible" })
  await page.waitForTimeout(500)
  await page.locator("#email").fill(user.email)
  await page.locator("#password").fill(user.password)
  await submit.click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

async function createIntention(
  page: Page,
  opts: { amount: string; purpose: string; funding_method: "REIMBURSEMENT" | "TRANSFER" }
) {
  await page.getByRole("button", { name: "Nueva solicitud" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.locator("#int-amount").fill(opts.amount)
  await dialog.locator("#int-purpose").fill(opts.purpose)
  await dialog.locator("#int-funding-method").selectOption(opts.funding_method)
  return dialog
}

function settlementCard(page: Page, description: string) {
  return page.locator("div.rounded-md.border.p-3").filter({ hasText: description })
}

async function openRequestByPurpose(page: Page, purpose: string): Promise<string> {
  await page.goto("/requests", { waitUntil: "networkidle" })
  await page.getByText(purpose, { exact: false }).click()
  await page.waitForURL(/\/requests\/[0-9a-f-]+/, { timeout: 10_000 })
  return page.url().split("/requests/")[1]
}

test.describe("Requests — Etapa 4/5 full lifecycle", () => {
  test("full flow: create, approve, transfer, settle, review, close-out", async () => {
    const browser = await chromium.launch()
    const minister = await (await browser.newContext()).newPage()
    const bursar = await (await browser.newContext()).newPage()

    await login(minister, "minister")
    await login(bursar, "bursar")

    // --- List + new-request dialog screenshots ---
    await minister.goto("/requests", { waitUntil: "networkidle" })
    await shot(minister, "05-requests", "list-minister-empty")

    await minister.getByRole("button", { name: "Nueva solicitud" }).click()
    let dialog = minister.getByRole("dialog")
    await shot(minister, "05-requests", "new-request-dialog-empty")
    await dialog.locator("#int-amount").fill("50000")
    await dialog.locator("#int-purpose").fill("E2E — compra de materiales")
    await shot(minister, "05-requests", "new-request-dialog-filled")
    await minister.keyboard.press("Escape")

    // --- Intention A: REIMBURSEMENT, full happy path ---
    const purposeA = "E2E reembolso A " + Date.now()
    await createIntention(minister, { amount: "50000", purpose: purposeA, funding_method: "REIMBURSEMENT" })
    await minister.getByRole("button", { name: "Enviar solicitud" }).click()
    await expect(minister.getByText("Solicitud enviada al equipo de tesorería")).toBeVisible({ timeout: 10_000 })

    const idA = await openRequestByPurpose(bursar, purposeA)
    await shot(bursar, "05-requests", "detail-pending-bursar")
    await bursar.getByRole("button", { name: "Aprobar" }).first().click()
    dialog = bursar.getByRole("dialog")
    await shot(bursar, "05-requests", "review-dialog")
    await dialog.locator("#review-msg").fill("Aprobado")
    await dialog.getByRole("button", { name: "Confirmar aprobación" }).click()
    await expect(bursar.getByText("Aprobada", { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    await shot(bursar, "05-requests", "detail-approved-reimbursement")

    await minister.goto(`/requests/${idA}`, { waitUntil: "networkidle" })
    const descA = "E2E gasto A " + Date.now()
    await minister.getByRole("button", { name: "Nueva rendición" }).click()
    dialog = minister.getByRole("dialog")
    await shot(minister, "05-requests", "settlement-new-dialog")
    await dialog.locator('input[inputmode="numeric"]').fill("50000")
    await dialog.getByPlaceholder("Detalle del gasto realizado").fill(descA)
    await pickToday(minister, dialog)
    await dialog.getByRole("button", { name: "Enviar a revisión" }).click()
    await minister.waitForTimeout(1000)
    await shot(minister, "05-requests", "settlement-pending")

    await bursar.goto(`/requests/${idA}`, { waitUntil: "networkidle" })
    let card = settlementCard(bursar, descA)
    await card.getByRole("button", { name: "Tomar para revisión" }).click()
    await expect(card.getByText("En revisión", { exact: true })).toBeVisible({ timeout: 10_000 })
    await shot(bursar, "05-requests", "settlement-in-review")
    await card.getByRole("button", { name: "Aprobar", exact: true }).click()
    dialog = bursar.getByRole("dialog")
    await shot(bursar, "05-requests", "settlement-review-dialog")
    await dialog.getByPlaceholder("Escribe un mensaje para el ministro").fill("Todo en orden")
    await dialog.getByRole("button", { name: "Confirmar" }).click()
    await expect(settlementCard(bursar, descA).getByText("Aprobada", { exact: true })).toBeVisible({
      timeout: 10_000
    })
    await shot(bursar, "05-requests", "settlement-approved")

    // Close-out dialog
    await bursar.reload({ waitUntil: "networkidle" })
    const closeBtn = bursar.getByRole("button", { name: "Cerrar solicitud" })
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click()
      dialog = bursar.getByRole("dialog")
      await shot(bursar, "05-requests", "close-out-dialog")
      await bursar.keyboard.press("Escape")
    }

    // --- Intention B: TRANSFER funding path ---
    const purposeB = "E2E transferencia B " + Date.now()
    await minister.goto("/requests", { waitUntil: "networkidle" })
    await createIntention(minister, { amount: "80000", purpose: purposeB, funding_method: "TRANSFER" })
    await minister.getByRole("button", { name: "Enviar solicitud" }).click()
    await expect(minister.getByText("Solicitud enviada al equipo de tesorería")).toBeVisible({ timeout: 10_000 })

    await openRequestByPurpose(bursar, purposeB)
    await bursar.getByRole("button", { name: "Aprobar" }).first().click()
    dialog = bursar.getByRole("dialog")
    await dialog.locator("#review-msg").fill("Aprobado B")
    await dialog.getByRole("button", { name: "Confirmar aprobación" }).click()
    await expect(bursar.getByText("Aprobada", { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    await shot(bursar, "05-requests", "detail-approved-transfer-pending-transfer")

    await bursar.getByRole("button", { name: "Registrar transferencia" }).click()
    dialog = bursar.getByRole("dialog")
    await shot(bursar, "05-requests", "register-transfer-dialog")
    await dialog.locator('input[inputmode="numeric"]').fill("80000")
    await pickToday(bursar, dialog)
    // Comprobante is required (registerTransferSchema.min(1)) — AttachmentInput
    // uploads to Supabase Storage on select, against the local Supabase stack.
    await dialog.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample-receipt.png")
    await expect(bursar.getByText("sample-receipt.png")).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole("button", { name: "Registrar" }).click()
    await bursar.waitForTimeout(1500)
    await shot(bursar, "05-requests", "transfer-registered")

    // --- Intention C: return-for-correction cycle ---
    const purposeC = "E2E reembolso C devolver " + Date.now()
    await minister.goto("/requests", { waitUntil: "networkidle" })
    await createIntention(minister, { amount: "40000", purpose: purposeC, funding_method: "REIMBURSEMENT" })
    await minister.getByRole("button", { name: "Enviar solicitud" }).click()
    await expect(minister.getByText("Solicitud enviada al equipo de tesorería")).toBeVisible({ timeout: 10_000 })

    const idC = await openRequestByPurpose(bursar, purposeC)
    await bursar.getByRole("button", { name: "Aprobar" }).first().click()
    dialog = bursar.getByRole("dialog")
    await dialog.locator("#review-msg").fill("Aprobado C")
    await dialog.getByRole("button", { name: "Confirmar aprobación" }).click()
    await expect(bursar.getByText("Aprobada", { exact: true }).first()).toBeVisible({ timeout: 10_000 })

    await minister.goto(`/requests/${idC}`, { waitUntil: "networkidle" })
    const descC = "E2E gasto C " + Date.now()
    await minister.getByRole("button", { name: "Nueva rendición" }).click()
    dialog = minister.getByRole("dialog")
    await dialog.locator('input[inputmode="numeric"]').fill("40000")
    await dialog.getByPlaceholder("Detalle del gasto realizado").fill(descC)
    await pickToday(minister, dialog)
    await dialog.getByRole("button", { name: "Enviar a revisión" }).click()
    await minister.waitForTimeout(1000)

    await bursar.goto(`/requests/${idC}`, { waitUntil: "networkidle" })
    card = settlementCard(bursar, descC)
    await card.getByRole("button", { name: "Tomar para revisión" }).click()
    await card.getByRole("button", { name: "Devolver" }).click()
    dialog = bursar.getByRole("dialog")
    await shot(bursar, "05-requests", "settlement-return-dialog")
    await dialog.getByPlaceholder("Escribe un mensaje para el ministro").fill("Falta el comprobante")
    await dialog.getByRole("button", { name: "Confirmar" }).click()
    await expect(settlementCard(bursar, descC).getByText("Devuelta para corrección", { exact: true })).toBeVisible({
      timeout: 10_000
    })
    await shot(bursar, "05-requests", "settlement-returned")

    await minister.goto(`/requests/${idC}`, { waitUntil: "networkidle" })
    await shot(minister, "05-requests", "settlement-returned-minister-view")
    card = settlementCard(minister, descC)
    await card.getByRole("button", { name: /Reenviar/ }).click()
    await minister.waitForTimeout(1000)

    // --- Intention D: reject + draft/cancel ---
    const purposeD = "E2E reembolso D rechazo " + Date.now()
    await minister.goto("/requests", { waitUntil: "networkidle" })
    await createIntention(minister, { amount: "30000", purpose: purposeD, funding_method: "REIMBURSEMENT" })
    await minister.getByRole("button", { name: "Enviar solicitud" }).click()
    await expect(minister.getByText("Solicitud enviada al equipo de tesorería")).toBeVisible({ timeout: 10_000 })

    await openRequestByPurpose(bursar, purposeD)
    await bursar.getByRole("button", { name: "Rechazar" }).first().click()
    dialog = bursar.getByRole("dialog")
    await shot(bursar, "05-requests", "reject-intention-dialog")
    await dialog.locator("#review-msg").fill("No corresponde")
    await dialog.getByRole("button", { name: "Confirmar rechazo" }).click()
    await expect(bursar.getByText("Rechazada", { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    await shot(bursar, "05-requests", "intention-rejected")

    // Draft settlement + cancel, on intention A (already approved & settled — use E instead)
    const purposeE = "E2E reembolso E draft " + Date.now()
    await minister.goto("/requests", { waitUntil: "networkidle" })
    await createIntention(minister, { amount: "20000", purpose: purposeE, funding_method: "REIMBURSEMENT" })
    await minister.getByRole("button", { name: "Enviar solicitud" }).click()
    await expect(minister.getByText("Solicitud enviada al equipo de tesorería")).toBeVisible({ timeout: 10_000 })
    const idE = await openRequestByPurpose(bursar, purposeE)
    await bursar.getByRole("button", { name: "Aprobar" }).first().click()
    dialog = bursar.getByRole("dialog")
    await dialog.locator("#review-msg").fill("Aprobado E")
    await dialog.getByRole("button", { name: "Confirmar aprobación" }).click()
    await expect(bursar.getByText("Aprobada", { exact: true }).first()).toBeVisible({ timeout: 10_000 })

    await minister.goto(`/requests/${idE}`, { waitUntil: "networkidle" })
    const descE = "E2E gasto E " + Date.now()
    await minister.getByRole("button", { name: "Nueva rendición" }).click()
    dialog = minister.getByRole("dialog")
    await dialog.locator('input[inputmode="numeric"]').fill("20000")
    await dialog.getByPlaceholder("Detalle del gasto realizado").fill(descE)
    await pickToday(minister, dialog)
    await shot(minister, "05-requests", "settlement-new-dialog-filled")
    await dialog.getByRole("button", { name: "Guardar borrador" }).click()
    await minister.waitForTimeout(1000)
    await shot(minister, "05-requests", "settlement-draft")

    card = settlementCard(minister, descE)
    await card.getByRole("button", { name: "Cancelar" }).click()
    await minister.waitForTimeout(1000)
    await shot(minister, "05-requests", "settlement-cancelled")

    // Open vs closed split on the list
    await minister.goto("/requests", { waitUntil: "networkidle" })
    await shot(minister, "05-requests", "list-minister-open-closed")

    await bursar.goto("/requests", { waitUntil: "networkidle" })
    await shot(bursar, "05-requests", "list-bursar")

    await browser.close()
  })
})
