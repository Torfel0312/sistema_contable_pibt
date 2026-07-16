import { type Page, type Locator, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import type { UserKey } from "./users"
import { USERS } from "./users"

const SCREENSHOTS_ROOT = path.join(process.cwd(), "docs", "screenshots")

export async function login(page: Page, userKey: UserKey) {
  const user = USERS[userKey]
  await page.goto("/", { waitUntil: "networkidle" })
  // The login form is a client component (react-hook-form's handleSubmit attaches
  // on hydration) — clicking "Ingresar" before hydration completes falls through
  // to the raw <form>'s native GET submission (email/password end up as query
  // params on "/"). networkidle alone isn't always enough in Next dev mode, so
  // wait for the button to actually be the hydrated one before interacting.
  const submit = page.getByRole("button", { name: "Ingresar" })
  await submit.waitFor({ state: "visible" })
  await page.waitForTimeout(500)
  await page.locator("#email").fill(user.email)
  await page.locator("#password").fill(user.password)
  await submit.click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

// Saves under docs/screenshots/<section>/<name>.png, creating the folder as needed.
// Full-page by default so forms/tables aren't cropped — pass fullPage: false for
// a fixed-viewport shot of a modal that shouldn't scroll to its bottom.
export async function shot(page: Page, section: string, name: string, opts?: { fullPage?: boolean }) {
  const dir = path.join(SCREENSHOTS_ROOT, section)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: opts?.fullPage ?? true
  })
}

const DATE_TRIGGER_RE = /Seleccionar fecha|^\d{2}-\d{2}-\d{4}$/

// Picks today's date in one of this app's DatePicker instances, scoped to `scope`
// (page or a narrower locator) to disambiguate when a dialog has more than one.
// Closes the popover afterward by clicking the same trigger again (toggle) —
// more reliable in this app's Base UI Popover than Escape/outside-click, which
// don't reliably dismiss it (discovered during Etapa 5/6 manual verification).
export async function pickToday(page: Page, scope: Page | Locator = page) {
  const trigger = scope.getByRole("button", { name: DATE_TRIGGER_RE })
  await trigger.click()
  await page.getByRole("button", { name: "Hoy" }).last().click()
  await trigger.click()
}

export function uniqueLabel(prefix: string): string {
  return `${prefix} ${Date.now()}`
}

export async function expectToast(page: Page, text: string) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 })
}
