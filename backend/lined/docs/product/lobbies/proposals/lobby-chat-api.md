# API Proposal — Lobby Mini Chat

**Branch:** `feature/lobby-chat-api`
**Status:** Proposed
**Motivation:** README Phase 2 ("In-lobby mini chat"). Coordination
conversations ("can we move dinner to 8?") currently have to happen outside
Lined, right next to the plans they are about.

## What the API should do

Minimal member-only message log per lobby — deliberately not a full chat
platform (no threads, reactions, attachments, or read receipts in v1):

```
POST /api/lobbies/{id}/messages
Body: { "body": "Can we move dinner to 8?" }        (1–2000 chars)
→ 201 LobbyMessageDto { id, lobbyId, authorId, body, createdAt, editedAt: null }

GET /api/lobbies/{id}/messages?before={messageId}&limit=50
→ 200 LobbyMessageDto[]     (newest first; keyset pagination via `before`)

PATCH /api/lobbies/{id}/messages/{messageId}    Body: { "body": "…" }   (author only)
DELETE /api/lobbies/{id}/messages/{messageId}                            (author or owner)
```

- All endpoints member-only (`403` otherwise); deleting a lobby cascades its
  messages; deleting an account (existing semantics) clears authorship or
  removes messages — pick and document one, consistent with the
  account-deletion doc.
- **Delivery model v1: polling.** The web client polls
  `GET …/messages?after={lastSeenId}` on an interval while the chat panel is
  open. No WebSocket/SSE in v1 — that keeps the experiment deployment
  scenarios (kind/HPA) unchanged. A later proposal can add SSE or the
  Kafka-backed push hinted in the README stack.
- New-message notifications reuse the notification pipeline behind a new
  per-lobby preference (`chatMessagesEnabled`), so muting a noisy lobby works
  like every other notification type.

## Why it matters

- Keeps the coordination loop (see plan → discuss → adjust) inside the
  product; strongest retention feature of Phase 2.
- Small, well-bounded v1: one entity, four endpoints, existing access seam
  (`lobby` membership checks) and notification seam reused.

## Implementation notes

- New `chat` module: entity `LobbyMessage` (lobby FK LAZY, author FK LAZY,
  `body`, `createdAt`/`editedAt` as `OffsetDateTime` UTC), repository with
  keyset query, service enforcing membership/authorship via the shared lobby
  access seam, thin controller.
- Validation: `@NotBlank`, max length; trim; reject whitespace-only edits.
- Tests: pagination ordering, permission matrix (member/author/owner/
  outsider), cascade on lobby delete.

## Definition of done

Members can post, list (paginated), edit, and delete messages with correct
permissions; new-message notifications respect preferences; documented in
`docs/foundation/api.md`; quality gates pass.
