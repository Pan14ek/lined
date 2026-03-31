# CLAUDE.md — Lined Mockups

> Quick reference for Claude Code. Full detail in AGENTS.md.

## What This Is

Static single-file HTML prototype of the Lined web app (1440 px desktop).
No build step. No framework. One file: `mockups/index.html`.

## Serve Locally

```bash
npx serve -p 4321 mockups/
# → http://localhost:4321
```

Or use `preview_start { name: "mockups" }` (configured in `.claude/launch.json`).

## 15 Screens (nav label → screen id)

| Screen | id |
|---|---|
| Sign In | `signin` |
| Sign Up | `signup` |
| Dashboard | `dashboard` |
| + Create (dropdown open) | `dashboard-create` |
| Lobby: Tasks | `lobby` |
| Lobby: Calendar | `lobby-calendar` |
| Lobby: Members | `lobby-members` |
| Add Member | `add-member` |
| Add Task | `add-task` |
| Lobby Settings | `lobby-settings` |
| Calendar | `calendar` |
| Create Event | `create-event` |
| Reserve Slot | `reserve-slot` |
| Tasks Board | `tasks` |
| User Settings | `user-settings` |

## Key Rules

1. **Never use raw hex values** — only CSS variables from `:root`.
2. **Never add `min-height: NNpx`** — use `flex: 1; min-height: 0` instead.
3. **Modal overlays** need `position: absolute; inset: 0` inside `.screen.active`
   (which has `position: relative`). Don't nest them inside `overflow: hidden` containers.
4. **Nav wraps to 2 rows** — `.screens { padding-top: 84px }`. Update if adding many nav items.
5. **Anastasiia's avatar initial is "An"** (not "A") — distinguishes her from Alex in shared views.

## Design Tokens

- Brand: `--green` `--green-lt` `--green-dk` `--sidebar` `--beige`
- Lobby colours: `--couple` (pink) `--family` (orange) `--friends` (purple) `--work` (blue)
- Task status: `--todo` (slate) `--inprog` (blue) `--done` (green)

## After Editing

Always take a screenshot via `preview_screenshot` to verify:
- Screens fill full viewport height (no white gap at bottom)
- Modals/drawers render on top of dimmed content
- Lobby name shows "Alex & Anastasiia" (not Jordan)

## Related Files

- `AGENTS.md` — full layout architecture, CSS class reference, pitfalls
- `../lined-web/` — the actual React implementation this mockup informs
- `../lined-web/docs/mockups.md` — how mockup screens map to React routes and components
