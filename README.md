# Rayenz Hub

Monorepo for [Rayenz Hub](https://rayenz-akusiom.github.io/rayenz-akusiom/) (Dailies, Deck Review, Order Reconcile), Neopets Tampermonkey userscripts, and the hub test harness.

## Layout

| Path | Purpose |
|------|---------|
| `rayenz-hub/` | Hub source (dev/staging): Dailies, Deck Review, Deck Suggest, Order Reconcile |
| `monkey-scripts/` | Neopets userscripts — edit and push here |
| `tests/` | Hub test harness (Vitest + Playwright) |

Production hub is deployed separately to [rayenz-akusiom.github.io/rayenz-akusiom](https://rayenz-akusiom.github.io/rayenz-akusiom/) via `git subtree push`.

## Clone

```bash
git clone https://github.com/rayenz-akusiom/rayenz-hub.git
```

## Publishing

**Userscripts** — commit and push to `rayenz-hub` `main`. No GitHub Pages deploy.

**Hub (Dailies / Deck Review / Order Reconcile)** — edit under `rayenz-hub/`, commit to `rayenz-hub` `main`, then deploy to production:

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
