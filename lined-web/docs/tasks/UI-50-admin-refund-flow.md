# Task 50 — Admin Refund Preview + Issue Flow

**Branch:** `feature/ui-50-admin-refund-flow`

*Depends on Task 49 (admin account detail page). Backend BE-13
(refund preview + issue endpoints), BE-14 (`BILLING_REFUND`
permission).*

## Detailed description

Add a refund action to the admin transactions section. Preview shows
the exact refundable amount, currency, refund type, and access-behavior
choice — with the "outside default window" flag surfaced so the admin
knows they're issuing an exceptional refund.

- **Refund button on each transaction row** — visible only when
  caller has `BILLING_REFUND`; hidden when transaction is
  `FAILED` or already fully refunded.
- **Two-step flow:**
  1. **Preview modal** — `POST /api/admin/billing/transactions/{id}/refund-preview`.
     Modal shows: transaction summary, `maxRefundable` amount +
     currency, `withinDefaultWindow` badge (green when true; amber
     "Outside window — exceptional refund" when false), refund type
     picker (`FULL`, `PARTIAL`, `PRORATED_UNUSED_TIME`), amount
     input (auto-filled from `maxRefundable` for FULL; user-editable
     for PARTIAL/PRORATED — validated `> 0` and `≤ maxRefundable`),
     reason code dropdown (fixed list from design §31), reason text
     (optional textarea), `accessBehavior` toggle:
     `KEEP_ACCESS_UNTIL_PERIOD_END | END_ACCESS_AFTER_REFUND`
     (default: `END_ACCESS_AFTER_REFUND` for `PRORATED_UNUSED_TIME`
     and `FULL`, `KEEP_ACCESS_UNTIL_PERIOD_END` for `PARTIAL`).
     Also displays the resulting effective plan (`PRO → FREE`) and
     expected lobby-downgrade effect ("N lobbies will become
     read-only for 30 days"). Design §47's confirmation UI list.
  2. **Confirm** — `POST /api/admin/billing/transactions/{id}/refunds`
     with a fresh `Idempotency-Key`. Success: toast "Refund submitted
     — waiting for provider confirmation"; the transaction row updates
     with a `Refund PENDING` badge; the refunds section polls until
     terminal.
- **Errors** — 400 `REFUND_AMOUNT_INVALID`, 409
  `REFUND_ALREADY_PROCESSED`, `REFUND_NOT_ELIGIBLE` → inline error in
  the modal.
- **Audit visibility** — the admin sees a note in the modal: "This
  action is audited to `billing_audit_log`."

## Idea of this task

Refunds are the highest-stakes admin action — the only irreversible
one that moves money and can flip a user's plan. The two-step
preview→confirm split, with `withinDefaultWindow` clearly flagged and
`accessBehavior` explicit, matches the design's §47 checklist and
gives the admin a chance to catch mistakes before they hit the
provider.

## Reference to mockup

- No mockup — modal treatment matches the existing `ConfirmDialog`
  scaled up; sketch in PR description.

## Development steps

1. **MSW first.** Extend `src/features/admin/api/handlers.ts`:
   - POST `.../transactions/{id}/refund-preview` returns
     `{ maxRefundableMinor, currency, withinDefaultWindow, type,
     transactionSnapshot }`
   - POST `.../transactions/{id}/refunds` returns
     `{ refundId, status: 'PENDING' }`; on 400/409 return stable
     error code
   - `dev.ts` + `prod.ts` mirror
2. **Hooks.** `usePreviewRefund(transactionId)`,
   `useIssueRefund(transactionId)`; mutations invalidate the admin
   account view.
3. **Components.**
   - `RefundActionButton.tsx` — the row-level button + gate on
     `BILLING_REFUND`.
   - `RefundPreviewModal.tsx` — the multi-field form; controlled by
     `useForm` (react-hook-form) or a local Zustand slice; validation
     inline.
   - `RefundTypeSelector.tsx`, `AccessBehaviorToggle.tsx`,
     `RefundReasonCombobox.tsx` — small controlled inputs.
4. **Integration.** Mount `RefundActionButton` in
   `AdminTransactionsSection` (Task 49); render the modal from a
   parent Zustand flag.
5. **Tests.**
   - `RefundPreviewModal.test.tsx` — renders full/partial/prorated
     scenarios; amount validation; `accessBehavior` defaults correct;
     preview call fires on open; confirm fires the issue call.
   - `RefundActionButton.test.tsx` — hidden without
     `BILLING_REFUND`; hidden on FAILED or fully-refunded rows.
   - Hook tests: error codes surfaced correctly; refund PENDING
     appears in the row after submit.

## Final / expected result

- Admin with `BILLING_REFUND` can preview and issue any of the three
  refund types; UI blocks obviously invalid amounts; server error
  codes surface as inline errors.
- Post-submit the row reflects the PENDING refund and eventually
  SUCCEEDED / FAILED via polling (or the admin re-opens the page).
- The out-of-window flag is prominent when applicable.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Preview refund | `POST /api/admin/billing/transactions/{transactionId}/refund-preview` |
| Issue refund | `POST /api/admin/billing/transactions/{transactionId}/refunds` (header `Idempotency-Key`) |
| Poll refund status | `GET /api/admin/billing/accounts/{billingAccountId}` (refunds section) or a dedicated GET refund endpoint if BE-13 adds one |

**Backend gap:** BE-13 owns the endpoints. Verify BE-13's preview
response includes `withinDefaultWindow` (design §31 doesn't mandate it,
but §47 does for the UI). If missing, request its addition in the
BE-13 PR.
