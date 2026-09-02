# Task 4 — "+ Create" Menu & Create Lobby Modal

**Branch:** `feature/ui-04-create-menu-lobby-modal`

## Detailed description

Two pieces:

1. **Create dropdown** — clicking "+ Create ▾" in the dashboard top bar opens
   a dropdown with: New Event 📅, New Task ✅, New Lobby 👥, and a
   highlighted "Reserve Free Slot ✨" row (green background).
2. **Create Lobby modal** — a modal with lobby name input and a visual 2×2
   lobby-type picker (Couple 💑 / Family 👨‍👩‍👧‍👦 / Friends 🎉 / Work 💼,
   selected option gets green border + tinted background), Cancel / Create
   buttons. The mockup shows this picker style on the Lobby Settings screen
   (`lobby-settings`) — reuse the same `LobbyTypePicker` component for both.

## Idea of this task

One consistent entry point for all creation flows. The dropdown only
*dispatches* to modals owned by other tasks (CreateEventModal exists;
AddTaskDrawer = Task 8; ReserveSlotModal = Task 11) — this task implements
the menu itself, the shared UI store, and the Create Lobby modal end-to-end.

## Reference to mockup

- File: `mockups/index.html`, screen id **`dashboard-create`** (nav tab
  "+ Create") for the dropdown; the type-picker grid appears on screen id
  **`lobby-settings`** (`.type-grid` / `.type-opt` styles).
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.
- The Create Lobby modal now has a dedicated screen: id **`create-lobby`**
  (`http://localhost:4321/#create-lobby`) — name input, 2×2 type picker,
  owner hint, Cancel / Create Lobby buttons.

## Development steps

1. Create `src/store/createMenu.ts` (Zustand): which overlay is open
   (`'menu' | 'event' | 'task' | 'lobby' | 'reserveSlot' | null`) + open/close
   actions. Sidebar "+ New" (Task 2) and dashboard "+ Create" both use it.
2. Build `CreateMenu` using the shadcn `dropdown-menu` wrapper
   (`src/components/ui/dropdown-menu.tsx` — wrap, don't modify): items,
   divider, highlighted Reserve Free Slot row.
3. Wire items: New Event → existing `CreateEventModal`; New Task / Reserve
   Free Slot → open store state (Tasks 8/11 render the actual overlays; until
   then nothing renders — acceptable); New Lobby → `CreateLobbyModal`.
4. Build `LobbyTypePicker` (`src/components/LobbyTypePicker.tsx`) — 2×2 grid,
   keyboard accessible (radio-group semantics).
5. Build `CreateLobbyModal`: name input (required), type picker, submit via
   a new `useCreateLobby()` mutation (`createLobby`), invalidate the lobbies
   query, close, navigate to the new `/lobbies/:id`.
6. Tests (MSW): dropdown opens and lists 4 items; creating a lobby POSTs the
   right payload, refreshes the sidebar list, and navigates.

## Final / expected result

- "+ Create" in the dashboard opens the dropdown matching the mockup.
- "New Lobby" (from dropdown or sidebar "+ New") opens the modal; submitting
  creates the lobby, it appears in the sidebar immediately, and the app
  navigates to it.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Create lobby | `POST /api/lobbies` — body `LobbyCreateDto { name, lobbyType }` (Bearer session identifies owner) → `LobbyDto` |
| Refresh sidebar | `GET /api/lobbies/mine` → `LobbyDto[]` |
