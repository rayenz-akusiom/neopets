import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHubModule, resetHubModules } from '../helpers/hubHarness.js';

let ArchidektExport;

beforeEach(() => {
   resetHubModules();
   ArchidektExport = loadHubModule('apps/deck-review/archidekt-export.js', 'ArchidektExport');
});

afterEach(() => {
   resetHubModules();
});

describe('ArchidektExport.formatImportLine', () => {
   it('formats quantity, name, set, and collector number', () => {
      expect(ArchidektExport.formatImportLine(1, 'Sol Ring', 'cmm', '1', 'Ramp', null, null))
         .toBe('1x Sol Ring (cmm) 1 [Ramp]');
   });

   it('appends the foil token before the category bracket', () => {
      expect(ArchidektExport.formatImportLine(1, 'Sol Ring', 'cmm', '1', 'Ramp', null, 'foil'))
         .toBe('1x Sol Ring (cmm) 1 *F* [Ramp]');
   });

   it('appends the etched token before the category bracket', () => {
      expect(ArchidektExport.formatImportLine(2, 'Sol Ring', 'cmm', '1', 'Ramp', null, 'etched'))
         .toBe('2x Sol Ring (cmm) 1 *E* [Ramp]');
   });

   it('omits the printing when there is no set code', () => {
      expect(ArchidektExport.formatImportLine(1, 'Sol Ring', null, null, 'Ramp', null, null))
         .toBe('1x Sol Ring [Ramp]');
   });

   it('emits set only when collector number is missing', () => {
      expect(ArchidektExport.formatImportLine(1, 'Sol Ring', 'cmm', null, 'Ramp', null, null))
         .toBe('1x Sol Ring (cmm) [Ramp]');
   });

   it('suppresses the bracket for basic lands', () => {
      expect(ArchidektExport.formatImportLine(1, 'Forest', 'xyz', '1', 'Land', null, null))
         .toBe('1x Forest (xyz) 1');
   });
});

describe('ArchidektExport.formatFinishToken', () => {
   it('maps finishes to Archidekt tokens', () => {
      expect(ArchidektExport.formatFinishToken('foil')).toBe(' *F*');
      expect(ArchidektExport.formatFinishToken('etched')).toBe(' *E*');
      expect(ArchidektExport.formatFinishToken('nonfoil')).toBe('');
      expect(ArchidektExport.formatFinishToken(null)).toBe('');
   });
});

describe('ArchidektExport.formatCategoryBracket', () => {
   it('returns empty for no category', () => {
      expect(ArchidektExport.formatCategoryBracket('', 'Sol Ring', null)).toBe('');
   });

   it('marks the New Set In category noDeck/noPrice', () => {
      expect(ArchidektExport.formatCategoryBracket('New Set In', 'Sol Ring', null))
         .toBe(' [New Set In{noDeck}{noPrice}]');
   });

   it('honors category settings flags', () => {
      const settings = { Ramp: { includedInDeck: false, includedInPrice: false } };
      expect(ArchidektExport.formatCategoryBracket('Ramp', 'Sol Ring', settings))
         .toBe(' [Ramp{noDeck}{noPrice}]');
   });
});

describe('ArchidektExport.deckReviewComplete', () => {
   it('treats an empty list as complete', () => {
      expect(ArchidektExport.deckReviewComplete([], () => null))
         .toEqual({ complete: true, reviewed: 0, total: 0 });
   });

   it('reports incomplete when any suggestion lacks a decision', () => {
      const suggestions = [{ suggestion_id: 'a' }, { suggestion_id: 'b' }];
      const decisions = { a: { status: 'accepted' } };
      expect(ArchidektExport.deckReviewComplete(suggestions, (id) => decisions[id]))
         .toEqual({ complete: false, reviewed: 1, total: 2 });
   });

   it('reports complete when every suggestion has a decision', () => {
      const suggestions = [{ suggestion_id: 'a' }, { suggestion_id: 'b' }];
      const decisions = { a: { status: 'accepted' }, b: { status: 'skipped' } };
      expect(ArchidektExport.deckReviewComplete(suggestions, (id) => decisions[id]))
         .toEqual({ complete: true, reviewed: 2, total: 2 });
   });
});

describe('ArchidektExport.buildFullDeckImport', () => {
   const deck = {
      deck_id: 'd1',
      archidekt_url: 'https://archidekt.com/decks/123/foo',
      deck_snapshot: {
         cards: [
            { name: 'Llanowar Elves', set_code: 'm19', collector_number: '314', quantity: 1, primary_category: 'Ramp' },
            { name: 'Old Card', set_code: 'xyz', collector_number: '1', quantity: 1, primary_category: 'Ramp' },
         ],
      },
   };
   const accepted = [{
      suggestion_id: 's1',
      action: 'replace',
      quantity: 1,
      swap_categories: true,
      card_in: { name: 'Sol Ring', set_code: 'cmm', collector_number: '1', finish: 'foil' },
      card_out: { name: 'Old Card', set_code: 'xyz', collector_number: '1', quantity: 1 },
   }];

   it('keeps the unchanged main-deck card', () => {
      const text = ArchidektExport.buildFullDeckImport(deck, accepted);
      expect(text).toContain('1x Llanowar Elves (m19) 314 [Ramp]');
   });

   it('emits the swapped-in card with foil token in the New Set In category', () => {
      const text = ArchidektExport.buildFullDeckImport(deck, accepted);
      expect(text).toContain('1x Sol Ring (cmm) 1 *F* [New Set In{noDeck}{noPrice}]');
   });

   it('emits the swapped-out card in the New Set Out category', () => {
      const text = ArchidektExport.buildFullDeckImport(deck, accepted);
      expect(text).toContain('1x Old Card (xyz) 1 [New Set Out]');
   });

   it('returns empty string for a deck without a snapshot', () => {
      expect(ArchidektExport.buildFullDeckImport({ deck_id: 'x' }, accepted)).toBe('');
   });
});

describe('ArchidektExport.parseDeckId', () => {
   it('extracts the numeric deck id from an Archidekt url', () => {
      expect(ArchidektExport.parseDeckId('https://archidekt.com/decks/123456/my-deck')).toBe(123456);
   });

   it('returns null when there is no deck id', () => {
      expect(ArchidektExport.parseDeckId('https://example.com')).toBe(null);
   });
});
