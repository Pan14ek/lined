# Mockup → Implementation Reference

This document maps every screen in `mockups/index.html` to its planned
React route, page component, and key sub-components in `lined-web/`.

Mockup file: `mockups/index.html` (serve with `npx serve -p 4321 mockups/`)

---

## Screen Map

### Authentication

| Mockup screen | id | Route | Page component |
|---|---|---|---|
| Sign In | `signin` | `/sign-in` | `src/pages/SignInPage.tsx` |
| Sign Up | `signup` | `/sign-up` | `src/pages/SignUpPage.tsx` |

**Notes:**
- Auth screens use a centred card on a beige background (`--beige`).
- MVP auth: `X-User-Id` header (no real session). Replace with JWT when auth is added.
- Both pages share `AuthCard` wrapper component.

---

### Dashboard

| Mockup screen | id | Route | Page component |
|---|---|---|---|
| Dashboard | `dashboard` | `/` | `src/pages/DashboardPage.tsx` |
| + Create dropdown | `dashboard-create` | `/` (UI state) | Zustand `useCreateMenuStore` |

**Sub-components:**
- `LobbyCardGrid` — horizontal row of lobby summary cards
- `UpcomingEventsList` — next N events across all lobbies
- `MyTasksList` — tasks assigned to the current user
- `FreeSlotBanner` — the green "Free time found!" card; clicking opens Reserve Slot modal
- `CreateMenu` — dropdown that appears when "+ Create ▾" is clicked (Zustand UI state)

**Create menu options:**
- New Event → opens `CreateEventModal`
- New Task → opens `AddTaskDrawer`
- New Lobby → opens `CreateLobbyModal`
- Reserve Free Slot → opens `ReserveSlotModal`

---

### Lobby Detail

All three tabs live at the same route with a tab query param or nested route.

| Mockup screen | id | Route | Page component |
|---|---|---|---|
| Lobby: Tasks | `lobby` | `/lobbies/:id` | `src/pages/LobbyPage.tsx` |
| Lobby: Calendar | `lobby-calendar` | `/lobbies/:id?tab=calendar` | `src/pages/LobbyPage.tsx` |
| Lobby: Members | `lobby-members` | `/lobbies/:id?tab=members` | `src/pages/LobbyPage.tsx` |

**Sub-components:**
- `LobbyHeader` — lobby avatar, name, type badge, member avatar stack, action buttons
- `LobbyTabBar` — Calendar / Tasks / Members tabs
- `LobbyTaskList` — task rows with checkbox, assignee, due date (Tasks tab)
- `LobbyCalendarView` — week-view calendar scoped to lobby events (Calendar tab)
- `LobbyMemberList` — member cards with Owner/Member badge + actions (Members tab)
- `PendingInviteList` — pending invite rows under Members tab

**LobbyCalendarView notes:**
- Shows only events belonging to this lobby (filter by `lobbyId`).
- Free slot bands (green overlay) appear when all members are available.
- Reuses the same time-grid component as the global Calendar page.

---

### Modals & Drawers

These are UI-state overlays, not separate routes.

| Mockup screen | id | Trigger | Component |
|---|---|---|---|
| Create Event | `create-event` | "+ New event" on Calendar, "New Event" in Create menu | `src/components/CreateEventModal.tsx` |
| Reserve Slot | `reserve-slot` | "Plan something →" on FreeSlotBanner, "Reserve Free Slot" in Create menu | `src/components/ReserveSlotModal.tsx` |
| Add Member | `add-member` | "+ Add member" in LobbyHeader | `src/components/AddMemberModal.tsx` |
| Add Task | `add-task` | "+ Add task" in LobbyTaskList / kanban column footer | `src/components/AddTaskDrawer.tsx` |

**CreateEventModal fields:** title, lobby selector, start/end datetime, location, shared toggle, notify toggle.

**ReserveSlotModal fields:** pre-filled from the detected free slot (lobby, date, time range); activity title, location, attendees (auto-filled), notify toggle.

**AddMemberModal behaviour:** username/email search → search results list → Invite button per result. Shows "already in lobby ✓" for existing members.

**AddTaskDrawer fields:** title, description, assign-to (avatar picker), due date, status dropdown, notify toggle.

---

### Settings

| Mockup screen | id | Route | Page component |
|---|---|---|---|
| User Settings | `user-settings` | `/settings` | `src/pages/UserSettingsPage.tsx` |
| Lobby Settings | `lobby-settings` | `/lobbies/:id/settings` | `src/pages/LobbySettingsPage.tsx` |

**UserSettingsPage sections:**
- Profile (display name, username, email, avatar)
- Password & Security
- Notifications (toggles per event type)
- Appearance (theme selector)
- Danger Zone (delete account)

**LobbySettingsPage sections:**
- General (lobby name, lobby type picker — visual 2×2 grid)
- Lobby Notifications (per-lobby toggles)
- Danger Zone (leave lobby, delete lobby — delete only visible to owner)

---

### Global Calendar

| Mockup screen | id | Route | Page component |
|---|---|---|---|
| Calendar | `calendar` | `/calendar` | `src/pages/CalendarPage.tsx` |

**Sub-components:**
- `CalendarTopBar` — month nav, Today button, Week/Month toggle, "+ New event" button
- `WeekGrid` — 7-column time grid with hour lines
- `CalendarEvent` — positioned event block (coloured by lobby type)
- `FreeSlotBand` — green translucent band across columns when all members are free
- `EventDetailPanel` — right-side panel showing selected event details + Edit/Delete actions

---

### Tasks Board (Global)

| Mockup screen | id | Route | Page component |
|---|---|---|---|
| Tasks Board | `tasks` | `/tasks` | `src/pages/TasksPage.tsx` |

**Sub-components:**
- `KanbanBoard` — 3-column grid: To Do / In Progress / Done
- `KanbanCard` — card with priority bar, lobby tag, assignee avatar, due date
- `KanbanFilters` — All Lobbies / All Members / All Dates filter buttons

---

## Shared Layout

Every authenticated page uses the same shell:

```
AppShell
├── Sidebar (240px, dark)
│   ├── Logo
│   ├── Nav links (Dashboard, Calendar, Tasks)
│   ├── Lobby list (coloured dots)
│   └── UserFooter (avatar, name, email)
└── Main area (flex: 1)
    ├── TopBar (page-specific)
    └── Page content (scrollable)
```

Component: `src/components/AppShell.tsx`

---

## Design Tokens → Tailwind

The mockup uses CSS variables. Map them to Tailwind tokens in `tailwind.config.ts`:

| CSS variable | Tailwind token | Usage |
|---|---|---|
| `--green` `#5B9B6B` | `brand.green` | Primary buttons, active nav |
| `--green-lt` `#E8F5EE` | `brand.green-light` | Tinted backgrounds |
| `--green-dk` `#3D7050` | `brand.green-dark` | Text on green backgrounds |
| `--sidebar` `#1B2A1F` | `brand.sidebar` | Sidebar background |
| `--beige` `#F7F3ED` | `brand.beige` | Auth page background |
| `--couple` `#F4479B` | `lobby.couple` | Couple lobby accent |
| `--family` `#FB8A2F` | `lobby.family` | Family lobby accent |
| `--friends` `#A78BFA` | `lobby.friends` | Friends lobby accent |
| `--work` `#3FA6FA` | `lobby.work` | Work lobby accent |

---

## Personas in Mockups

| Name | Username | Role | Notes |
|---|---|---|---|
| Alex Johnson | @alex_johnson | Logged-in user | Green avatar (A) |
| Anastasiia Kovalenko | @nastia_k | Partner (Couple lobby) | Blue avatar (An) — "An" not "A" to avoid clash |

When building real components, replace hardcoded persona data with API-sourced user objects.

---

## Implementation Priority

Suggested build order based on mockup complexity and dependencies:

1. `AppShell` + `Sidebar` (needed by every screen)
2. `SignInPage` / `SignUpPage` (unblocks all others)
3. `DashboardPage` — `LobbyCardGrid`, `UpcomingEventsList`, `MyTasksList`, `FreeSlotBanner`
4. `LobbyPage` — Tasks tab first (simplest), then Calendar, then Members
5. `CalendarPage` — `WeekGrid`, `CalendarEvent`, `FreeSlotBand`, `EventDetailPanel`
6. `TasksPage` — `KanbanBoard`, `KanbanCard`
7. Modals: `CreateEventModal`, `AddTaskDrawer`, `ReserveSlotModal`, `AddMemberModal`
8. Settings: `UserSettingsPage`, `LobbySettingsPage`
