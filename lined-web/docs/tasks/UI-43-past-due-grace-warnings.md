# Task 43 — Past-Due + Grace Period Warnings

**Branch:** `feature/ui-43-past-due-grace-warnings`

*Depends on Task 38 (scaffold), Task 48 (customer portal — this task
reuses the portal button; if UI-48 hasn't shipped, use a placeholder
button and swap in UI-48). Backend BE-11 (past-due state), BE-15
(customer portal availability).*

## Detailed description

When a Pro user's payment fails, tell them exactly what happened,
when the grace period ends, and how to fix it — without hiding the
fact that Pro is still working for now.

- **Top-of-page banner on `/subscription`** — when
  `subscription.status==='PAST_DUE'`:
  > "**Payment issue** — we couldn't charge your card. You have Pro
  > until **{formattedGraceEndsAt}**. Update your payment method to
  > keep it."
  Amber color; primary CTA "Update payment method" (opens the
  customer portal via UI-48); secondary "Try renewal again" is
  omitted for MVP because it's the provider's job.
- **Persistent app-wide chip** — a small "⚠ Payment issue" chip in
  the top bar (right of the user avatar) linking to `/subscription`.
  Rendered by a new `BillingStatusChip` component consuming the same
  `useBillingMe`. Hidden on `/subscription`.
- **Grace-ended state** — the moment `now > graceEndsAt` (as computed
  by the server; local clock is only for display) and effective plan
  drops to FREE, the banner switches to:
  > "Your Pro subscription expired on **{formattedGraceEndsAt}**. Your
  > data is safe; some lobbies are now read-only. **Choose your Free
  > lobby** or **Re-subscribe**."
  Two CTAs: "Choose Free lobby" links to the flow shipped in UI-44;
  "Re-subscribe" opens the pricing card.
- **In-lobby callout** — every lobby detail page shows a subtle
  banner at the top when the owner is PAST_DUE (grace not ended)
  giving members context: "Payment issue on this lobby's owner
  account. Pro continues until {date}." Members only see it if they
  are in the lobby.
- **Notifications** — piggyback on the notification inbox (Task 16);
  no new notification types shipped here (BE-15 owns the templates).

## Idea of this task

A silent past-due state → surprise Free downgrade is the worst
possible UX. Visible-but-not-alarming banners + one clear "Update
payment method" action ride out the entire grace window; the same
component gracefully re-uses itself for the post-grace state.

## Reference to mockup

- No mockup screen exists yet — reuse the existing `notifications`
  amber-warning tone. Sketch inline in the PR description.

## Development steps

1. **MSW first.** Extend handlers with a new variant
   `PAST_DUE_IN_GRACE` (existing) and add a variant
   `PAST_DUE_GRACE_ENDED`; `setBillingMeVariant` can flip between.
2. **Components.**
   - `PaymentIssueBanner.tsx` — reads `billingMe.subscription`;
     renders three states (grace in progress, grace ended, none).
     Includes the "Update payment method" CTA (UI-48's button).
   - `BillingStatusChip.tsx` — the top-bar chip; hidden on
     `/subscription`.
   - `LobbyPaymentIssueCallout.tsx` — shown atop the lobby detail
     page when owner status is PAST_DUE. Owner-vs-member copy varies.
3. **Data.** Extend the existing `useLobby` hook (or add a new
   `useLobbyOwnerBillingHint`) to expose the owner's plan status via
   `GET /api/lobbies/{id}` (the response already includes owner id;
   this task adds a lightweight `GET /api/billing/me/lobby/{lobbyId}`
   or piggybacks on the lobby DTO — flag as backend gap if needed).
4. **Integration.** Render `PaymentIssueBanner` at the top of
   `BillingPage`; mount `BillingStatusChip` inside `TopBar`; render
   `LobbyPaymentIssueCallout` on the lobby detail page.
5. **Tests.**
   - `PaymentIssueBanner.test.tsx` — renders each of the three states;
     CTA opens portal (mocked); date formatting correct.
   - `BillingStatusChip.test.tsx` — hidden on `/subscription`;
     visible elsewhere; hidden when status is not PAST_DUE.
   - `LobbyPaymentIssueCallout.test.tsx` — owner vs. member copy.

## Final / expected result

- PAST_DUE (in grace): amber banner + persistent chip + lobby
  callouts + working portal CTA.
- PAST_DUE (grace ended): banner switches to the expired copy with
  Choose-Free-lobby and Re-subscribe actions.
- No banner when status is anything else.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Billing state | `GET /api/billing/me` |
| Open customer portal | `POST /api/billing/portal` (from UI-48) |
| Lobby detail (owner id) | `GET /api/lobbies/{id}` (existing) |

**Backend gap:** the "member sees owner's payment issue" requires the
lobby DTO to expose a small `ownerBillingHint` field. If BE doesn't
add it, gate the lobby callout behind a check that lives only on the
owner side. Flag in the PR description.
