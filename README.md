# Neopets userscripts

Tampermonkey/Greasemonkey scripts for Neopets quality-of-life and automation.

## Layout

| Path | Purpose |
|------|---------|
| `monkey-scripts/` | Userscripts — edit and push here |
| `rayenz-hub/` | Rayenz Hub source (dev/staging): Dailies, Deck Review |
| `tests/` | Hub test harness (Vitest + Playwright) |

Production hub is deployed separately to [rayenz-akusiom.github.io/rayenz-akusiom](https://rayenz-akusiom.github.io/rayenz-akusiom/) via `git subtree push`.

## Clone

```bash
git clone https://github.com/rayenz-akusiom/neopets.git
```

## Publishing

**Userscripts** — commit and push to `neopets` `main`. No GitHub Pages deploy.

**Hub (Dailies / Deck Review)** — edit under `rayenz-hub/`, commit to `neopets` `main`, then deploy to production:

```bash
# After committing hub changes in this repo:
npm run deploy:hub
```

This pushes `rayenz-hub/` to the [rayenz-akusiom](https://github.com/rayenz-akusiom/rayenz-akusiom) repo `main` branch (GitHub Pages).

To pull rare upstream edits from production into dev:

```bash
git subtree pull --prefix=rayenz-hub hub-prod main --squash
```

See [rayenz-hub/README.md](rayenz-hub/README.md) for Deck Review enrich workflow (paths inside that doc still refer to the production repo layout).
