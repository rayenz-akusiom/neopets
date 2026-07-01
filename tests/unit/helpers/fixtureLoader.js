import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_ROOT = path.resolve(__dirname, '../../fixtures/suggestions');

export function loadSuggestionFixture(name) {
   const filePath = path.join(FIXTURES_ROOT, name);
   return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function deckFromFixture(fixture, deckId) {
   const deck = (fixture.decks || []).find((d) => d.deck_id === deckId);
   if (!deck) {
      throw new Error(`deck_id not in fixture: ${deckId}`);
   }
   return deck;
}
