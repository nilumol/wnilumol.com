# Journal calendar validation

The calendar uses reader-local dates and starts in the current month with all history visible. Selecting a date filters history without changing the composer draft or any stored timestamp. Today selects the local current day; All entries restores the supplied reverse-chronological history.

## Repeatable checks

- `npm run journal:test`: date helpers (UTC boundaries, DST, leap years, month grids, filtering/count agreement) and storage regressions.
- `node scripts/journal/browser-check.mjs`: real Next.js hydration and Chrome interactions against synthetic entries. Uses the installed Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, or `CHROME_PATH`.
- `npm run build` and `git diff --check`: final production and whitespace checks. There is no lint script.

Run browser checks with no other Next.js process using this checkout. The harness creates a temporary `/journal/calendar-browser-fixture` route using the real journal layout, composer, calendar, and entry list. It removes that route, removes stale development route validators, restores generated `next-env.d.ts`, closes Chrome, and stops its server in `finally`. No fixture route remains for production. It neither calls the storage reader nor submits the composer; browser POST and non-local requests are blocked. Screenshots are saved under ignored `.next/journal-browser-evidence/`.

## Browser evidence (2026-09-28)

Passed in Chrome with Los Angeles and Tokyo timezones at each of 1280, 375, and 320 pixel viewport widths. The browser clock is fixed to February 29, 2024, while the server keeps its own clock, exercising the post-hydration local-date behavior.

Each of the six runs verifies:

- Initial history order, local-day filtering, entry counts, selected/today states, and empty-day messaging.
- UTC-midnight fixtures: the March 1 00:30 UTC entry belongs to February 29 in Los Angeles; the February 29 20:00 UTC entry belongs to March 1 in Tokyo.
- February has 29 buttons; previous/next navigation crosses December 2023–January 2024; Today returns to February 29; All entries restores history.
- Tab reaches the next-month control; Enter and Space activate month controls; Enter selects a day.
- The composer retains an unsaved draft across calendar interactions.
- Partial-read notices persist when filtering; empty history and failed-list states remain usable; the composer remains present on read failure.
- The inherited robots metadata remains noindex/nofollow; no browser errors or hydration mismatches occur.
- No document or calendar-container horizontal overflow occurs, including at 320 pixels.

Desktop and 320-pixel screenshots were visually inspected for the existing warm paper/oxblood styling, readable counts, and calendar placement above filtered entries. The first mobile run exposed square day buttons overflowing their grid tracks; explicit `width: 100%` fixed this while preserving the minimum button height. All six runs passed after that correction.

These checks use synthetic data only. Production Blob access and successful saves are intentionally outside this browser fixture; the save action and storage behavior are unchanged.

Final verification: all seven journal tests passed, the production build completed with `/journal` dynamic and no fixture route in its output, and `git diff --check` passed. The browser harness's generated-type cleanup was exercised by rerunning all six browser cases and then completing the production build. All processes started by the harness were stopped; only the calendar sizing fix, reusable browser harness, and this validation record changed in the final iteration.
