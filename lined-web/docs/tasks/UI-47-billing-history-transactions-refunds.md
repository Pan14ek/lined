# Task 47 — Transactions & Refunds History

**Branch:** `feature/ui-47-billing-history-transactions-refunds`

*Depends on Task 38 (scaffold). Backend BE-13 (`GET /api/billing/transactions`
+ `GET /api/billing/refunds`).*

## Detailed description

Give users a receipts/refunds view on `/subscription` so they can see
what they were charged, when, and the status of any refund. This
replaces the old `SubscriptionHistoryCard` (which listed subscription
periods, not financial transactions).

- **Two tabs** — Transactions | Refunds — under a "Payment history"
  card. Empty tab shows an `EmptyState` ("No payments yet" / "No
  refunds yet").
- **Transactions row** — date (localized), interval label (Monthly /
  Yearly), amount (`formattedAmount` from the server — never
  computed), status badge (Succeeded / Failed / Refunded / Partially
  refunded), and — where the server exposes it — a "Receipt ↗" link
  to the provider receipt.
- **Refunds row** — date, refund type (Full / Partial / Prorated),
  amount, status badge (Pending / Succeeded / Failed / Rejected),
  refund reason (short — click to expand for full reason text).
- **Pagination** — `useInfiniteQuery` with `page`/`size` (backend
  paginates); "Load more" button.
- **Cross-links** — a refund row's "View transaction" opens a small
  drawer/modal showing the parent transaction inline (extracted from
  the same list via id).

## Idea of this task

Support tickets about "what did you charge me?" are eliminated when
the user can self-serve the answer. Keeping the display purely
`formattedAmount` + `status` (both from the server) means the browser
is never wrong.

## Reference to mockup

- Reuse the existing `SubscriptionHistoryCard` layout (list rows with
  a status badge). Sketch the tab treatment in PR description; align
  with the Kanban filter pills used elsewhere for tabs.

## Development steps

1. **MSW first.** Extend `src/features/billing/api/handlers.ts`:
   - GET `/api/billing/transactions?page=&size=` returning mock rows
     with pagination shape `{ items, page, size, total }`
   - GET `/api/billing/refunds?page=&size=` same shape
   - `dev.ts` + `prod.ts`: `listTransactions(page, size)`,
     `listRefunds(page, size)`
2. **Types.** `TransactionDto`, `RefundDto`, `PaginatedList<T>` types
   in `model/index.ts`.
3. **Hooks.** `useTransactions()`, `useRefunds()` — `useInfiniteQuery`
   keyed under `QUERY_KEYS.transactions` / `.refunds`.
4. **Components.**
   - `PaymentHistoryCard.tsx` — tab host.
   - `TransactionsList.tsx`, `RefundsList.tsx`.
   - `RefundReasonRow.tsx` — expand/collapse of `reasonText`.
   - `TransactionDetailDrawer.tsx` — the small drawer opened from a
     refund row.
5. **Page wiring.** Render `PaymentHistoryCard` in `BillingPage`
   below the manage card.
6. **Remove legacy.** Delete `SubscriptionHistoryCard.tsx` from
   `src/features/subscription/` and its imports. The old MSW handler
   for `/api/subscriptions/{userId}/history` was already removed in
   UI-38's cleanup — verify.
7. **Tests.**
   - `TransactionsList.test.tsx` — renders rows; loads more;
     empty state.
   - `RefundsList.test.tsx` — status badges; expand reason;
     "View transaction" opens drawer with correct data.
   - Hook tests: `useInfiniteQuery` pagination.

## Final / expected result

- `/subscription` shows a Payment History card with Transactions and
  Refunds tabs, each paginated.
- Rows display server-provided amounts and statuses; no client-side
  currency math.
- Empty states render appropriately when there's no history.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Transactions | `GET /api/billing/transactions?page=&size=` |
| Refunds | `GET /api/billing/refunds?page=&size=` |

**Backend gap:** none once BE-13 ships. Verify server returns
pagination shape `{ items, page, size, total }`; if it differs, adapt
the hook.
