# Neopets userscripts

Tampermonkey/Greasemonkey scripts for Neopets quality-of-life and automation.

## Layout

| Path | Repo | Purpose |
|------|------|---------|
| `monkey-scripts/` | **this repo** (`neopets`) | Userscripts — edit and push here |
| `rayenz-akusiom/` | [rayenz-akusiom](https://github.com/rayenz-akusiom/rayenz-akusiom) submodule | GitHub Pages hub (Dailies, Deck Review) |

## Clone

```bash
git clone --recurse-submodules https://github.com/rayenz-akusiom/neopets.git
```

## Publishing

**Userscripts** — commit and push to `neopets` `main`. No GitHub Pages deploy.

**Hub (Dailies / Deck Review)** — work inside the submodule and push to the Pages repo:

```bash
cd rayenz-akusiom
git push origin main   # deploys https://rayenz-akusiom.github.io/rayenz-akusiom/
cd ..
git add rayenz-akusiom && git commit -m "Bump rayenz-akusiom submodule"   # optional
```

See [rayenz-akusiom/README.md](rayenz-akusiom/README.md) for Deck Review enrich workflow.
