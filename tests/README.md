# Rayenz Hub tests

Automated tests for the [rayenz-hub](../rayenz-hub/) hub live in this folder at the **parent repo root**, not inside the hub source tree. Test files must never be added under `rayenz-hub/`.

## Prerequisites

- Node.js 18+
- `npm install` from the repo root

## Commands

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Vitest + happy-dom (fast in-process DOM tests) |
| `npm run test:unit:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright browser tests |
| `npm run test:e2e:install` | Install Chromium for Playwright (one-time) |
| `npm test` | Run unit tests, then e2e |

## Layout

```
tests/
  unit/
    helpers/hubHarness.js   # Loads hub IIFE sources into happy-dom
    hub/                    # Hub app tests
    userscripts/            # Reserved for Tampermonkey script tests
  e2e/
    static-server.mjs       # Serves rayenz-hub/ over HTTP
    hub-navigation.spec.js  # Real-browser navigation regression
```

## Regression: Dailies expand after navigation

The hub re-injects `dailies.html` when switching routes. `dailies.js` must re-run `window.__initDailiesApp()` so collapsible sections get click listeners again.

- **Unit:** `tests/unit/hub/dailies-reinit.test.js` — Dailies → Deck Review → Dailies, then toggle `.active` on a collapsible.
- **E2E:** `tests/e2e/hub-navigation.spec.js` — same flow in Chromium against the real static server.

## Future: userscripts

`tests/unit/userscripts/` is reserved for tests of `monkey-scripts/*.user.js` (e.g. training school completion parsing). A future helper can stub `GM_*`, jQuery, and `fetch` without touching the hub source tree.
