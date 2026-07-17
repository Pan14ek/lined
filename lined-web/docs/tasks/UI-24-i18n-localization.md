# Task 24 — Localization (English + Ukrainian)

**Branch:** `feature/ui-24-i18n-localization`

*Depends on Task 12 (settings page hosts the switcher). Do before or in
parallel with Tasks 19–23, but coordinate with whatever is in flight — this
task touches every user-facing string. Best landed **before** large new
surfaces (chat, stats) so they are born localized.*

## Detailed description

Every string in the app is hard-coded English. First supported languages:
**English** (default) and **Ukrainian**.

1. **Framework** — `react-i18next` + `i18next` (ICU-style interpolation via
   `i18next-icu` or the built-in format). JSON resource files per language,
   namespaced by area (`common`, `auth`, `calendar`, `tasks`, `lobby`,
   `settings`, `notifications`). TypeScript-typed keys (i18next's
   `CustomTypeOptions`) so a missing key is a compile error, keeping the
   "strict, no `any`" rule.
2. **Extraction sweep** — replace literals in all pages/components with
   `t()` keys. Personas, lobby names, user-generated content are **not**
   translated.
3. **Ukrainian specifics** — Ukrainian has three plural forms: use
   i18next's plural support (`count`-based) everywhere counts appear
   ("2 members", "9+ unread", "3 tasks"). Dates/times through a single
   locale-aware layer: the existing `calendarUtils` formatters switch to
   `Intl.DateTimeFormat(locale)` (uk gives "субота, 18 липня 2026");
   relative time (`formatRelativeTimeAgo`) via `Intl.RelativeTimeFormat`.
4. **Switcher** — a "Language & Region" card in User Settings PREFERENCES
   (menu item already exists in the mockup): radio rows for English /
   Українська with a live preview strip. Choice applies instantly, persists
   in the settings store, and PATCHes `users/{id}.locale` when the backend
   field ships (mock-first via MSW until then).
5. **First-visit default** — `navigator.language` (`uk*` → Ukrainian) when
   the user hasn't chosen; `<html lang>` kept in sync.

## Idea of this task

Ukrainian-speaking couples and families are an explicit early market —
and a schedule app you share with a parent or partner must speak their
language. Doing it while the app is ~30 components keeps the sweep cheap;
every later feature inherits the pattern.

## Reference to mockup

- New screen id **`language`** (`http://localhost:4321/#language`):
  Language & Region settings card with 🇬🇧/🇺🇦 radio rows (Ukrainian
  selected), a green preview strip showing translated dashboard strings,
  and the "applies immediately, saved to your profile" note.

## Development steps

1. Add `i18next`/`react-i18next`, an `src/i18n/` module (init, resource
   imports, typed keys) wired in `main.tsx`; `en.json` first, then
   `uk.json`.
2. Extract strings page-by-page (one commit per namespace keeps review
   sane); route date/number formatting through locale-aware helpers.
3. Build the settings card + store field (`locale`), `navigator.language`
   fallback, `<html lang>` sync; PATCH `locale` behind an MSW-mocked field
   until `feature/user-locale-preference` ships.
4. Localized notification text: render from `messageKey`/`messageParams`
   when present (per the backend proposal), falling back to the English
   `message` string.
5. Tests: switching language re-renders a sample page in Ukrainian; plural
   forms for 1/2/5 items; date formatter output per locale; persisted
   choice survives reload; missing-key lint (CI check that `uk.json` keys
   mirror `en.json`).

## Final / expected result

- The whole UI runs in English or Ukrainian, switchable from Settings with
  correct plurals and dates, defaulting sensibly and persisting.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Persist choice | `PATCH /api/users/{id}` with `locale` |
| Read choice | `GET /api/users/{id}` (`locale` field) |

**Backend gap:** the `locale` field and notification `messageKey` are
proposed in `backend/lined/docs/api-proposals/user-locale-preference.md`
(`feature/user-locale-preference`); until it ships this task is mock-only
for persistence (client-side locale still fully works).
