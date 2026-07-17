# Business Flow Diagrams

## Fund Request Flow (Solicitud de Fondos)

A ministry submits a fund request (intention). Treasury reviews it, registers the transfer,
and the ministry must later submit a settlement with receipts.

```mermaid
sequenceDiagram
    actor Minister as Ministry (MINISTER)
    actor Treasury as Treasury (BURSAR/FINANCE)
    participant System as System
    participant Email as Resend (Email)

    Minister->>System: Submit fund request (amount + description)
    System->>System: Insert budget_intentions (status: PENDING)
    System->>Email: Notify treasury (new request)
    Email-->>Treasury: Email — new request

    Treasury->>System: Review request → Approve or Reject
    Note over System: Already-reviewed requests are rejected with 409 (no double review)

    alt Approved
        System->>Email: Notify ministry (approved)
        Email-->>Minister: Email — request approved
        Treasury->>System: Register transfer (intention_transfers row)
        System->>Email: Notify ministry (transfer registered)
        Email-->>Minister: Email — transfer done, submit settlement
    else Rejected
        System->>Email: Notify ministry (rejected)
        Email-->>Minister: Email — request rejected
    end

    Note over Minister,Treasury: Either party may add request_comments at any point (entity_type + entity_id)
```

Note: there is no per-ministry budget check anymore — budget allocation tracking was removed
from the platform (see CLAUDE.md); budgets are tracked outside the system.

### States

`budget_intentions.status` is a 3-value enum: `PENDING | APPROVED | REJECTED` — that's it.
Transfer registration and settlement are **not** intention states; they live in separate tables
(`intention_transfers`, `expense_settlements`) linked to the intention.

```mermaid
stateDiagram-v2
    [*] --> PENDING : Ministry submits request
    PENDING --> APPROVED : Treasury approves
    PENDING --> REJECTED : Treasury rejects
    APPROVED --> APPROVED : Treasury registers transfer (intention_transfers row, no status change)
    REJECTED --> [*]
    APPROVED --> [*] : Ministry settlement flow continues (see below)
```

---

## Settlement Flow (Rendición de Fondos)

After receiving a transfer (or spending out of pocket, for REIMBURSEMENT requests), the ministry
submits one or more settlements with receipts for treasury review. A single request can have
several settlements (e.g. a partial purchase) — the UI groups requests as "open" or "closed" based
on whether every settlement has reached a terminal state and treasury has closed the request out.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Minister starts a settlement (optional draft)
    [*] --> PENDING : Minister submits directly (no draft)
    DRAFT --> PENDING : Minister submits
    DRAFT --> CANCELLED : Minister cancels
    PENDING --> IN_REVIEW : Treasury takes it for review
    PENDING --> CANCELLED : Minister cancels
    IN_REVIEW --> APPROVED : Treasury approves
    IN_REVIEW --> REJECTED : Treasury rejects
    IN_REVIEW --> RETURNED_FOR_CORRECTION : Treasury returns with comments
    RETURNED_FOR_CORRECTION --> PENDING : Minister resubmits
    RETURNED_FOR_CORRECTION --> CANCELLED : Minister cancels
    APPROVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

`IN_REVIEW` is a lock: once treasury takes a settlement into review, the minister can no longer
edit or cancel it until a decision is made (approve, reject, or return for correction).

```mermaid
sequenceDiagram
    actor Minister as Ministry (MINISTER)
    actor Treasury as Treasury (BURSAR/ADMIN)
    participant System as System
    participant Email as Resend (Email)

    Minister->>System: Submit settlement + attachments (draft or direct, see 01-file-uploading)
    System->>System: Insert expense_settlements (status: DRAFT or PENDING, is_late if >30 days from expense_date)
    opt Was a draft
        Minister->>System: Submit draft for review (DRAFT -> PENDING)
    end

    Treasury->>System: Take for review (PENDING -> IN_REVIEW)
    Treasury->>System: Approve, reject, or return for correction

    alt Approved
        alt REIMBURSEMENT
            System->>System: Admin client inserts movements row (category "Rendiciones de Ministerio")
        else TRANSFER
            System->>System: Reuse the movement already created when the transfer was registered (no second movement)
        end
        System->>System: Link movement_id back onto the settlement; audit-log both
        System->>Email: Notify ministry (settlement approved)
    else Rejected
        System->>Email: Notify ministry (settlement rejected)
    else Returned for correction
        System->>System: Insert request_comments row (entity_type SETTLEMENT)
        System->>Email: Notify ministry (settlement returned, with comment)
        Minister->>System: Resubmit (RETURNED_FOR_CORRECTION -> PENDING)
    end
```

Note: cancellation (minister-initiated) is only allowed from `DRAFT`, `PENDING`, or
`RETURNED_FOR_CORRECTION` — never from `IN_REVIEW`. Approval is still the point where a real
`movements` row gets created for `REIMBURSEMENT` requests; it bypasses normal RLS via the
service-role client because `movements` inserts are otherwise restricted to ADMIN/BURSAR.

### Cierre de solicitud — adjunto del comprobante de devolución

Once every settlement under a request has reached a terminal state (`APPROVED` or `CANCELLED`,
with at least one `APPROVED`), treasury can close the request out: attach the proof of the closing
transfer (`intention_attachments`, scoped to the request rather than any single settlement, since
one closing transfer can cover several settlements) and set
`budget_intentions.settlement_closed_at`. A closed request is immutable — no further settlements
or transfers are expected — and is what the requests list uses to move a request from "open" to
"closed".

---

## Movement Registration Flow (Movimientos)

Standard income or expense recording with audit trail and always-on integrations.

```mermaid
flowchart TD
    A([User creates movement]) --> B[API validates session + Zod schema]
    B --> C[Service saves to DB]
    C --> E[Audit log entry created]
    E --> F["processMovementIntegrations() — Promise.allSettled, always runs, each independent"]
    F --> G[Google Apps Script webhook → PDF generated + saved to Drive]
    F --> I[Google Apps Script webhook → Google Sheets sync]
    F --> J[Resend email notification → treasury + registering user]
    G --> K([pdf_status / synced_to_sheet / notification_status persisted on movements])
    I --> K
    J --> K
```

Note: all three integrations always fire in parallel — there's no feature flag gating them.
`allSettled` means one failing (e.g. PDF generation error) never blocks the others; each
outcome is persisted independently on the `movements` row.

### Movement states

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : Created
    ACTIVE --> ACTIVE : Edited
    ACTIVE --> CANCELLED : Logically cancelled (no physical delete)
    CANCELLED --> [*]
```

---

## Payroll Registration Flow (Remuneraciones)

ADMIN-only feature (`MANAGE_PAYROLL`). UBACH sends a monthly liquidación externally (not
tracked in the app); the ADMIN registers the resulting transfers — salary, contributions,
and optionally other related payments — as a single monthly `payroll_records` row with N
linked movements (`payroll_movements`), one per transfer. The number of transfers is not
fixed at 2: the client confirmed there can be more.

```mermaid
flowchart TD
    A([ADMIN registers monthly payroll]) --> B[Zod validates period + 1..N line items]
    B --> C["register_payroll() RPC — SECURITY DEFINER, atomic"]
    C --> D[Insert payroll_records row, period normalized to month start]
    C --> E["For each line: insert movements (EXPENSE, category Remuneraciones)"]
    E --> F[Insert payroll_movements linking record ↔ movement ↔ kind]
    F --> G[Attachments uploaded to Drive per movement, same pattern as Etapa 1]
    G --> H([System audit log entry: PAYROLL_REGISTERED])
```

One `payroll_records` row per calendar month (unique index on `period`, always the 1st of
the month) — attempting a second registration for the same month fails at the DB level.

### Reserva de indemnización (severance reserve)

Append-only ledger, same philosophy as `movement_audit_log` — never edited destructively,
only appended to. Current balance is always derived, never stored as a mutable field.

```mermaid
flowchart LR
    A([ADMIN adjusts reserve]) --> B[Zod validates amount_delta ≠ 0 + required note]
    B --> C[Insert severance_reserve_adjustments row]
    C --> D([Balance = SUM of all amount_delta])
```

---

## Ministry Leftover Calculation (Remanente por Ministerio)

Per request, and aggregated by ministry: how much of a TRANSFER-funded request's money was
never accounted for in an approved settlement. Cutoff is "as of a date" (`p_as_of`, default
today) — not a start/end range.

```
remanente = monto_transferido − SUM(rendiciones APROBADAS hasta la fecha de corte)
```

```mermaid
flowchart TD
    A([Ministry detail page loads]) --> B["get_ministry_leftover_summary(ministry_id, as_of) RPC"]
    B --> C[Filter: funding_method = TRANSFER only]
    C --> D[Filter: settlement status = APPROVED — explicit whitelist, not a blacklist]
    D --> E[Group by intention, then by ministry]
    E --> F([Table: per-request leftover + ministry total])
```

Two deliberate filters, both from the plan: `funding_method = 'TRANSFER'` (leftover only
makes sense on the advance-transfer path — REIMBURSEMENT never has money sitting with the
ministry), and `status = 'APPROVED'` as an explicit whitelist rather than `!= 'REJECTED'`.
The whitelist is what keeps this calculation independent of the settlement state machine
Etapa 5 introduced — `DRAFT`/`RETURNED_FOR_CORRECTION` never accidentally count as
"accounted for." Negative leftover (over-spent) is shown with its real sign, never clamped
to zero.

---

## Dashboard Consolidado (Etapa 8)

Pure composition — no new schema or calculation, just surfacing Etapa 6 and Etapa 7's data
on the main dashboard. Restricted to `VIEW_MOVEMENT` (ADMIN/BURSAR/FINANCE) — MINISTER
doesn't see either widget, and the data isn't even fetched for a viewer who won't see it.

```mermaid
flowchart TD
    A([Dashboard page loads]) --> B{VIEW_MOVEMENT?}
    B -- No --> C([Only the standard KPIs/charts render])
    B -- Yes --> D["dashboardService.getSummary(period, includeFinanceWidgets: true)"]
    D --> E[severanceReserveService.getBalance] & F[ministryLeftoverService.getSummary, grouped by ministry]
    E --> G([SeveranceReserveCard])
    F --> H([MinistryLeftoverWidget — per-ministry totals, links to /ministries/:id])
```

---

## Scheduled Reminders

A Supabase cron job (`supabase/migrations/20260426000002_reminder_cron.sql`) runs periodically
and sends a summary email to treasury when there are pending items.

```mermaid
flowchart LR
    Cron([Cron trigger]) --> Q[Query pending intentions + settlements + missing transfers]
    Q --> Check{Any pending?}
    Check -- Yes --> Email[Resend summary email → treasury]
    Check -- No --> Skip([Skip])
```
