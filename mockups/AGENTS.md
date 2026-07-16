# AGENTS.md — Lined Mockups

> Reference for AI agents working on the HTML/CSS mockups.
> Read before editing `index.html`.

---

## What This Is

`mockups/` is a **single-file static prototype** — one self-contained
`index.html` that renders all MVP screens for the Lined web application
(1440 px desktop-first).

It is **not a product**. It is a design reference and communication tool.
No build step. No dependencies. No JavaScript framework.

---

## Serving Locally

```bash
# From repo root — requires Node.js (any version)
npx serve -p 4321 mockups/
# → http://localhost:4321
```

The server configuration is in `.claude/launch.json` under the name `mockups`.
Claude Code can start it with `preview_start { name: "mockups" }`.

---

## File Structure

```
mockups/
└── index.html    # Everything: CSS variables, styles, all screens, nav script
```

All CSS is in a `<style>` block in `<head>`. All screens are `<div>` elements
with `id` and class `screen` inside `.screens`. The nav bar calls `show(id)`
to switch screens.

---

## Screen Inventory

| Nav label | Screen `id` | What it shows |
|---|---|---|
| Sign In | `signin` | Auth — email + password login |
| Sign Up | `signup` | Auth — registration form |
| Dashboard | `dashboard` | Home: lobby cards, events, tasks, free-slot card |
| + Create | `dashboard-create` | Dashboard with "+ Create ▾" dropdown open |
| Lobby: Tasks | `lobby` | Lobby detail — Tasks tab active |
| Lobby: Calendar | `lobby-calendar` | Lobby detail — Calendar tab, week view |
| Lobby: Members | `lobby-members` | Lobby detail — Members tab, member cards + pending invites |
| Add Member | `add-member` | Lobby + "Add Member" search modal |
| Add Task | `add-task` | Lobby Tasks + right-side "Add Task" drawer |
| Lobby Settings | `lobby-settings` | Lobby settings: name, type picker, notification toggles, danger zone |
| Calendar | `calendar` | Full calendar — week view, event detail panel, free-slot bands |
| Create Event | `create-event` | Calendar + "New Event" modal |
| Reserve Slot | `reserve-slot` | Dashboard + "Reserve Free Slot" modal (pre-filled from free-slot detection) |
| Tasks Board | `tasks` | Global kanban: To Do / In Progress / Done columns |
| User Settings | `user-settings` | User profile, notifications, appearance, danger zone |
| Create Lobby | `create-lobby` | Dashboard + "New Lobby" modal (name + type picker) — UI task 04 |
| Calendar: Month | `calendar-month` | Full calendar — month grid with event chips, "+N more", free-slot chip — UI task 10 |
| Notifications | `notifications` | Dashboard + bell dropdown open (unread rows, badge, mark all read) — UI task 16 |
| Invites | `invites` | Dashboard with pending-invite cards (Accept / Decline) — UI task 17 |
| Subscription | `subscription` | Current plan, available plan cards, subscription history — UI task 14 |

Screens support deep links: `http://localhost:4321/#<screen-id>`. The nav
script reads `location.hash` on load/hashchange and updates it on click.

---

## Design Tokens (CSS Variables)

Defined in `:root` at the top of `<style>`. Never use raw hex values outside
of `:root` — always reference a variable.

| Variable | Value | Usage |
|---|---|---|
| `--green` | `#5B9B6B` | Brand primary, buttons, active states |
| `--green-lt` | `#E8F5EE` | Green tints, free-slot backgrounds |
| `--green-dk` | `#3D7050` | Green text on light backgrounds |
| `--sidebar` | `#1B2A1F` | Sidebar background |
| `--beige` | `#F7F3ED` | Auth page background |
| `--bg` | `#F4F4F7` | Main content area background |
| `--couple` | `#F4479B` | Couple lobby accent |
| `--family` | `#FB8A2F` | Family lobby accent |
| `--friends` | `#A78BFA` | Friends lobby accent |
| `--work` | `#3FA6FA` | Work lobby accent |
| `--todo` | `#94A3B8` | Task status: To Do |
| `--inprog` | `#3B82F6` | Task status: In Progress |
| `--done` | `#10B981` | Task status: Done |

---

## Layout Architecture

```
html, body { height: 100% }
  .screens { padding-top: 84px; height: 100vh; flex-column }   ← 84px = 2-row nav
    .screen { display: none; flex: 1; min-height: 0 }
    .screen.active { display: flex; flex-direction: column; position: relative }
      .layout { display: flex; flex: 1; min-height: 0 }         ← sidebar + main
        .sidebar { width: 240px; flex-shrink: 0 }
        .main { flex: 1; flex-column; overflow: hidden }
          .topbar / .lobby-header / .tab-bar { flex-shrink: 0 }
          .content { flex: 1; overflow-y: auto }
```

Key rules:
- `min-height: 0` on every flex child that needs to shrink — without it, flex
  children overflow their container.
- `position: relative` on `.screen.active` allows modal/drawer overlays
  (`position: absolute; inset: 0; z-index: 200`) to fill exactly the screen.
- Never add `min-height` fixed pixel values — use `flex: 1` instead.

---

## Overlay Pattern (modals & drawers)

Screens that show a modal or drawer over a base layout use:

```html
<div class="screen" id="my-screen">
  <div class="layout">
    <!-- base content dimmed with opacity + pointer-events:none -->
    <div style="opacity:.25; pointer-events:none; ..."> ... </div>

    <!-- overlay anchored to .screen.active via position:absolute -->
    <div class="modal-overlay">   <!-- or .drawer-overlay -->
      <div class="modal-dialog">  <!-- or .drawer -->
        ...
      </div>
    </div>
  </div>
</div>
```

Existing overlay screens: `create-event`, `reserve-slot`, `add-member`, `add-task`.

---

## Component CSS Classes

### Structural
- `.layout` — sidebar + main flex row
- `.sidebar` — dark left nav (240 px)
- `.main` — right content column
- `.topbar` — 64 px white bar with title + actions
- `.content` — scrollable padded body area (24 px 32 px)

### Sidebar
- `.sb-nav-item` + `.active` — nav link (active has green left border + indent)
- `.sb-lobby-item` + `.active` — lobby entry with coloured dot
- `.sb-user` — user avatar + name/email at the bottom

### Cards & Lists
- `.lobby-card` — lobby summary card (used on Dashboard)
- `.event-card` — upcoming event row
- `.task-card` — task row (Dashboard)
- `.task-row` — task row with checkbox (Lobby Tasks tab)
- `.kanban-col` / `.kanban-card` — kanban board columns and cards
- `.member-card` — member card (Lobby Members tab)

### Modals & Drawers
- `.modal-overlay` / `.modal-dialog` / `.modal-header` / `.modal-body` / `.modal-footer`
- `.drawer-overlay` / `.drawer` / `.drawer-hd` / `.drawer-bd` / `.drawer-ft`

### Forms
- `.form-group` / `.form-label` / `.form-input` / `.form-select` / `.form-textarea`
- `.form-row` — two-column grid (used for start/end datetime pairs)
- `.toggle-row` / `.toggle-switch` / `.toggle-switch.off`

### Settings
- `.settings-inner` / `.settings-menu` / `.settings-scroll`
- `.settings-card` / `.settings-card-hd` / `.settings-rows` / `.settings-row`
- `.danger-card` / `.danger-card-hd` / `.danger-rows` / `.danger-row`

### Buttons
- `.btn-primary` — full-width auth button (green fill)
- `.btn-green` — compact green fill button
- `.btn-outline` — white with border
- `.btn-danger` — white with red border
- `.btn-danger-fill` — solid red

### Badges
- `.lobby-type-badge` — Couple / Family / Friends / Work label
- `.status-badge` — TODO / IN PROGRESS / DONE
- `.role-badge` + `.role-owner` / `.role-member`
- `.free-slot-tag` — green pill used in Reserve Slot modal

---

## Personas Used in Mockups

| Name | Initial | Avatar colour | Role |
|---|---|---|---|
| Alex Johnson | A | `var(--green)` | Primary user (logged-in) |
| Anastasiia Kovalenko | An | `var(--inprog)` (blue) | Partner in "Alex & Anastasiia" lobby |
| — | M | `#FB8A2F` (orange) | Family lobby member |

**Important:** Anastasiia uses the two-letter initial **"An"** (not "A") to
distinguish her avatar from Alex's when both appear in the same view.

---

## Adding a New Screen

1. Add a `<div id="new-screen-id" class="screen">` block before
   `</div><!-- /screens -->`.
2. Add a nav link in `.screen-nav`:
   ```html
   <a href="#" onclick="show('new-screen-id')">Label</a>
   ```
3. If the screen height is not `84px` (nav is exactly 2 rows), update
   `.screens { padding-top: ... }`.
4. Take a preview screenshot to verify full-height layout.

---

## Common Pitfalls

1. **White space at the bottom** — caused by missing `flex: 1; min-height: 0`
   on a container in the chain. Trace from `html` down to the leaf.
2. **Modal/drawer invisible** — the overlay must be a child of `.screen.active`
   (which has `position: relative`). Do not put it inside `.main` if `.main`
   has `overflow: hidden`.
3. **Adding `min-height: NNpx`** — never do this. Use `flex: 1` instead.
4. **Hard-coding hex colours** — always use a CSS variable.
5. **Jordan still in the mockup** — the persona was renamed to Anastasiia;
   avatar initial is "An", background `var(--inprog)`.
6. **Nav overflow** — the nav wraps to 2 rows; `padding-top` on `.screens`
   is `84px`. If you add many more nav items, measure and update this value.
