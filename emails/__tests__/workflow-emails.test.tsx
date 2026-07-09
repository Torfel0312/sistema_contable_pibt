import { renderToStaticMarkup } from "react-dom/server"

import { IntentionNotificationEmail } from "../intention-notification-email"
import { IntentionReviewEmail } from "../intention-review-email"
import { ReminderEmail } from "../reminder-email"
import { SettlementReviewEmail } from "../settlement-review-email"
import { TransferNotificationEmail } from "../transfer-notification-email"

const render = (el: React.ReactElement) => renderToStaticMarkup(el)

const intention = { amount: 200000, description: "Compra de sillas" }
const minister = { full_name: "Ana González" }
const detailUrl = "https://example.com/requests/1"

describe("IntentionNotificationEmail", () => {
  it("renders with amount and description", () => {
    const html = render(IntentionNotificationEmail({ intention, reviewUrl: detailUrl }))
    expect(html).toContain("200.000")
    expect(html).toContain("Compra de sillas")
    expect(html).toContain(detailUrl)
  })
})

describe("IntentionReviewEmail", () => {
  it("shows approved status", () => {
    const html = render(
      IntentionReviewEmail({ intention, minister, action: "APPROVED", detailUrl })
    )
    expect(html).toContain("aprobada")
    expect(html).toContain("Ana González")
    expect(html).toContain("200.000")
  })

  it("shows rejected status", () => {
    const html = render(
      IntentionReviewEmail({ intention, minister, action: "REJECTED", detailUrl })
    )
    expect(html).toContain("rechazada")
  })
})

describe("TransferNotificationEmail", () => {
  it("renders with minister name, amount and settlement reminder", () => {
    const html = render(TransferNotificationEmail({ intention, minister, detailUrl }))
    expect(html).toContain("Ana González")
    expect(html).toContain("200.000")
    expect(html).toContain("30 días")
    expect(html).toContain(detailUrl)
  })
})

describe("SettlementReviewEmail", () => {
  const settlement = { amount: 185000, description: "Gastos conferencia" }

  it("shows approved settlement", () => {
    const html = render(
      SettlementReviewEmail({ settlement, minister, action: "APPROVED", detailUrl })
    )
    expect(html).toContain("aprobada")
    expect(html).toContain("185.000")
    expect(html).toContain("Ana González")
  })

  it("shows rejected settlement", () => {
    const html = render(
      SettlementReviewEmail({ settlement, minister, action: "REJECTED", detailUrl })
    )
    expect(html).toContain("rechazada")
  })
})

describe("ReminderEmail", () => {
  it("renders pending item counts", () => {
    const summary = { intentions: 3, settlements: 1, missing_transfers: 2 }
    const html = render(ReminderEmail({ summary, dashboardUrl: detailUrl }))
    expect(html).toContain("6 item")
    expect(html).toContain("Intenciones pendientes")
    expect(html).toContain("Rendiciones pendientes")
    expect(html).toContain("Transferencias pendientes")
  })

  it("renders zero counts", () => {
    const summary = { intentions: 0, settlements: 0, missing_transfers: 0 }
    const html = render(ReminderEmail({ summary, dashboardUrl: detailUrl }))
    expect(html).toContain("0 item")
  })
})
