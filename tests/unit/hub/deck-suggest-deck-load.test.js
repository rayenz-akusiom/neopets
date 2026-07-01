import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHubModule, resetHubModules } from '../helpers/hubHarness.js';

const MODULES = [
   'shared/storage.js',
   'shared/hub-utils.js',
   'shared/swap-queue.js',
   'apps/deck-review/archidekt-export.js',
   'apps/order-reconcile/order-reconcile-export.js',
   'apps/deck-suggest/deck-suggest.js',
   'apps/deck-suggest/ds-data.js',
];

let DS;

beforeEach(() => {
   resetHubModules();
   loadHubModule(MODULES);
   DS = window.DeckSuggest;
});

afterEach(() => {
   resetHubModules();
});

describe('DeckSuggest.Data.parseDeckListFromText', () => {
   it('parses Archidekt URLs one per line', () => {
      const text = 'https://archidekt.com/decks/3533613/baird\n# comment\nhttps://archidekt.com/decks/99999';
      const decks = DS.Data.parseDeckListFromText(text);
      expect(decks).toHaveLength(2);
      expect(decks[0].deck_id).toBe('deck-3533613');
      expect(decks[0].deck_name).toBe('Baird');
      expect(decks[1].deck_id).toBe('deck-99999');
   });

   it('throws on invalid lines', () => {
      expect(() => DS.Data.parseDeckListFromText('not-a-url')).toThrow(/Invalid Archidekt/);
   });

   it('throws when empty', () => {
      expect(() => DS.Data.parseDeckListFromText('  \n# only comments\n')).toThrow(/at least one/);
   });
});

describe('DeckSuggest.Data.buildDeckFromImportText', () => {
   it('builds a deck with snapshot from import lines', () => {
      const text = '1x Sol Ring (cmm) 1 [Ramp]\n1x Lightning Bolt (mh2) 123 [Removal]';
      const deck = DS.Data.buildDeckFromImportText(text, { deck_name: 'Test deck' });
      expect(deck.deck_name).toBe('Test deck');
      expect(deck.deck_snapshot.source).toBe('paste-import');
      expect(deck.deck_snapshot.cards).toHaveLength(2);
      expect(deck.deck_snapshot.cards[0].name).toBe('Sol Ring');
   });

   it('uses archidekt_url for deck id when provided', () => {
      const deck = DS.Data.buildDeckFromImportText('1x Sol Ring (cmm) 1 [Ramp]', {
         archidekt_url: 'https://archidekt.com/decks/3533613/baird',
      });
      expect(deck.deck_id).toBe('deck-3533613');
   });
});

describe('DeckSuggest.applyDeckList', () => {
   it('selects all decks by default', () => {
      DS.Render = { renderSetup: () => {} };
      DS.applyDeckList([
         { deck_id: 'd2', deck_name: 'Zebra' },
         { deck_id: 'd1', deck_name: 'Alpha' },
      ]);
      expect(DS.state.deckSelection.decks.map((d) => d.deck_name)).toEqual(['Alpha', 'Zebra']);
      expect(DS.state.deckSelection.selectedIds).toEqual(['d1', 'd2']);
   });
});

describe('DeckSuggest.resolveDeckLoadTab', () => {
   it('defaults to paste-import when bridge is unavailable', () => {
      DS.state.ui.deckLoadTab = null;
      DS.state.settings.deckLoadTab = null;
      expect(DS.resolveDeckLoadTab()).toBe('paste-import');
   });

   it('falls back to paste-import when folder saved but bridge unavailable', () => {
      DS.state.settings.deckLoadTab = 'folder';
      expect(DS.resolveDeckLoadTab()).toBe('paste-import');
   });

   it('maps legacy paste tab to paste-urls', () => {
      DS.state.settings.deckLoadTab = 'paste';
      expect(DS.resolveDeckLoadTab()).toBe('paste-urls');
   });
});

describe('HubUtils.handoffSnapshotSummary', () => {
   it('counts reviewable decks with snapshots', () => {
      const summary = HubUtils.handoffSnapshotSummary({
         decks: [
            {
               suggestions: [{ suggestion_id: 's1' }],
               deck_snapshot: { cards: [{ name: 'A' }] },
            },
            {
               suggestions: [],
               deck_snapshot: null,
            },
            {
               suggestions: [{ suggestion_id: 's2' }],
               deck_snapshot: null,
            },
         ],
      });
      expect(summary.reviewable).toBe(2);
      expect(summary.withSnapshots).toBe(1);
      expect(summary.missingSnapshots).toBe(1);
      expect(summary.allReady).toBe(false);
   });
});
