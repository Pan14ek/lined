# Task 23 — Dark Mode Audit & Polish

**Branch:** `feature/ui-23-dark-mode-audit`

*Depends on Task 12 (user settings), which shipped the theme toggle. Do
after Tasks 19–21; before or after Task 22 (coordinate to avoid touching
the same files simultaneously).*

## Detailed description

Task 12 added a Light / Dark / System appearance setting that toggles the
`dark` class on `<html>` — but the components were designed light-only and
have never been audited in dark mode. Hard-coded `bg-white`, `text-*` and
border utilities that don't switch produce unreadable or half-dark screens
the moment a user flips the toggle we already ship.

1. **Token layer** — define the dark palette once in the Tailwind config /
   CSS variables (surface, elevated surface, border, text primary/
   secondary/muted, input bg), so components use semantic tokens
   (`bg-surface`, `text-text-primary`, …) that resolve per theme — the
   same "no raw hex" rule the light theme already follows. Lobby accents
   (couple/family/friends/work) and status colours keep their hues; verify
   they meet WCAG AA contrast on dark surfaces and adjust tints
   (`*-lt` backgrounds → low-alpha dark equivalents).
2. **Audit every screen** — with MSW seed data, walk all routes and
   overlays (both themes): auth pages, dashboard (+ invites, bell
   dropdown), calendar week/month (+ event panel, day agenda, free-slot
   bands, now-line), lobby tabs, all modals/drawers, kanban, settings ×2,
   subscription. Fix `bg-white`-style hard-coding as found.
3. **System mode correctness** — "System" must react to OS theme changes
   live (`matchMedia('(prefers-color-scheme: dark)')` listener — verify
   the Task 12 implementation actually subscribes rather than reading
   once).
4. **Meta polish** — `color-scheme` CSS property + `<meta name="theme-color">`
   per theme so scrollbars/form controls match.

## Idea of this task

We already sell the toggle in Settings — an unaudited dark mode is a
broken promise on every screen. One token pass makes dark a first-class
theme instead of an accident.

## Reference to mockup

- No dedicated dark mockup screen. Source of truth is the token table:
  keep `--green`/lobby/status hues; map surfaces to a deep neutral ramp
  (e.g. sidebar keeps `#1B2A1F`; content bg ≈ slate-900 equivalents),
  chosen in the Tailwind config, not per-component. Add the final mapping
  to `lined-web/docs/mockups.md` when done.

## Development steps

1. Extend `tailwind.config.ts` (and the CSS variable layer it references)
   with semantic surface/text/border tokens with light + dark values;
   migrate obvious offenders (`bg-white` → `bg-surface`, etc.) via a
   repo-wide sweep.
2. Route-by-route visual audit at 1280×800 in both themes (checklist in
   the PR description with a screenshot per route in dark).
3. Fix the System-mode listener if it doesn't live-update.
4. Tests: theme store already has coverage from Task 12 — add a test that
   toggling adds/removes the `dark` class and that System mode reacts to a
   mocked `matchMedia` change event.

## Final / expected result

- Every screen and overlay is fully legible and visually coherent in dark
  mode; System follows the OS live; no raw colour utilities that only work
  on light.
- Lint, typecheck, tests, build pass.

## REST API used

None — presentation only.
