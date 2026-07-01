#!/usr/bin/env node
/**
 * Slice representative decks from a suggestions JSON file into a test fixture.
 *
 * Usage:
 *   node tests/scripts/extract-suggestion-fixture.mjs \
 *     --decks baird,god-bane,ashes-of-love-irl,big-ol-borbs-landscaping-irl \
 *     --output tests/fixtures/suggestions/msh-2026-06-21.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
   const opts = {
      input: path.join(REPO_ROOT, 'rayenz-hub/data/suggestions/latest.json'),
      output: path.join(REPO_ROOT, 'tests/fixtures/suggestions/msh-2026-06-21.json'),
      decks: [],
   };

   for (let i = 2; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === '--input' && argv[i + 1]) {
         opts.input = path.resolve(argv[++i]);
      } else if (arg === '--output' && argv[i + 1]) {
         opts.output = path.resolve(argv[++i]);
      } else if (arg === '--decks' && argv[i + 1]) {
         opts.decks = argv[++i].split(',').map((id) => id.trim()).filter(Boolean);
      } else if (arg === '--help' || arg === '-h') {
         console.log(`Usage: node tests/scripts/extract-suggestion-fixture.mjs [options]

Options:
  --input  <path>   Source suggestions JSON (default: rayenz-hub/data/suggestions/latest.json)
  --output <path>   Fixture output path (default: tests/fixtures/suggestions/msh-2026-06-21.json)
  --decks  <ids>    Comma-separated deck_id values to include (required)
`);
         process.exit(0);
      }
   }

   if (!opts.decks.length) {
      console.error('Error: --decks is required (comma-separated deck_id list)');
      process.exit(1);
   }

   return opts;
}

function main() {
   const { input, output, decks: deckIds } = parseArgs(process.argv);

   if (!fs.existsSync(input)) {
      console.error(`Error: input file not found: ${input}`);
      process.exit(1);
   }

   const source = JSON.parse(fs.readFileSync(input, 'utf8'));
   if (!source.meta || !Array.isArray(source.decks)) {
      console.error('Error: input must contain meta and decks[]');
      process.exit(1);
   }

   const byId = new Map(source.decks.map((deck) => [deck.deck_id, deck]));
   const missing = deckIds.filter((id) => !byId.has(id));
   if (missing.length) {
      console.error(`Error: deck_id not found in source: ${missing.join(', ')}`);
      process.exit(1);
   }

   const fixture = {
      meta: source.meta,
      decks: deckIds.map((id) => byId.get(id)),
   };

   fs.mkdirSync(path.dirname(output), { recursive: true });
   fs.writeFileSync(output, JSON.stringify(fixture, null, 4) + '\n', 'utf8');

   const bytes = fs.statSync(output).size;
   console.log(`Wrote ${output} (${fixture.decks.length} decks, ${bytes} bytes)`);
}

main();
