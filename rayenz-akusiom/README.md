# Rayenz Hub

Personal multi-app hub hosted on GitHub Pages.

## Apps

- **Dailies** — Neopets dailies launcher (requires [rayenz-dailies.user.js](../monkey-scripts/rayenz-dailies.user.js) for automation)
- **Deck Review** — Review MTG set-update suggestions and export Archidekt swap-queue import text

## Deck Review workflow

1. Generate suggestions with the `mtg-deck-set-updates` Cursor skill.
2. Enrich with deck snapshots and profile preferences (`protected_cards`, `blocked_cards`):

   ```powershell
   .\scripts\enrich_suggestions.ps1 -Input ~\mtg\decks\suggestions\MSH-2026-06-19.json -Output data\suggestions\latest.json
   ```

3. Commit and push `data/suggestions/latest.json` (or upload JSON on the Deck Review page).
4. Review swaps on tablet or PC. On **desktop Chrome**, connect your profiles folder in the right nav and use **Never suggest again** to update `~/mtg/decks/profiles/{deck_id}.yaml` directly.
5. After changing profiles on PC, re-run `enrich_suggestions` so tablet-loaded `latest.json` reflects new blocklists.
6. Copy import text into Archidekt (or use [archidekt-deck-review.user.js](../monkey-scripts/archidekt-deck-review.user.js) on Safari/desktop).

### Never suggest again (fallback CLI)

If File System Access API is unavailable (non-Chromium browser), append preferences manually:

```bash
python scripts/apply_never_again.py --deck god-bane --block "Door of Destinies"
python scripts/apply_never_again.py --deck god-bane --protect "Taurean Mauler"
```

- **In** side → `blocked_cards` (never suggest as add/replace-in)
- **Out** side → `protected_cards` (never suggest as cut/replace-out)

## Local dev

Serve this folder over HTTP (not `file://`). The dailies userscript matches `localhost` and GitHub Pages.
