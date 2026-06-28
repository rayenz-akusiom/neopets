import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHubModule, resetHubModules } from '../helpers/hubHarness.js';

let DR;

const FILES = [
   'shared/hub-utils.js',
   'apps/deck-review/archidekt-export.js',
   'apps/deck-review/profile-sync.js',
   'apps/deck-review/deck-review.js',
   'apps/deck-review/dr-data.js',
   'apps/deck-review/dr-pickers.js',
   'apps/deck-review/dr-profiles.js',
   'apps/deck-review/dr-decisions.js',
   'apps/deck-review/dr-render.js',
];

function deckWithSnapshot() {
   return {
      deck_id: 'd1',
      deck_name: 'Test Deck',
      archidekt_url: 'https://archidekt.com/decks/12345/test',
      profile_preferences: { blocked_cards: ['Blocked Card'], protected_cards: ['Sol Ring'] },
      suggestions: [
         {
            suggestion_id: 's1',
            priority_tier: 'swap',
            confidence: 'high',
            action: 'replace',
            card: { name: 'New Card', set_code: 'NIN', collector_number: '1', scryfall_id: 'sf-1' },
            replaces: [{ name: 'Old Card' }],
            roles_matched: ['ramp'],
            rationale: 'better',
         },
      ],
      deck_snapshot: {
         fetched_at: '2026-01-01',
         cards: [
            { name: 'New Card', primary_category: 'New Set In', set_code: 'nin', collector_number: '1' },
            { name: 'Old Card', primary_category: 'New Set Out', set_code: 'old', collector_number: '2' },
            { name: 'Sol Ring', primary_category: 'Ramp', set_code: 'cmm', collector_number: '3' },
            { name: 'Cut Me', primary_category: 'Ramp', set_code: 'cmm', collector_number: '4' },
         ],
      },
   };
}

beforeEach(() => {
   resetHubModules();
   DR = loadHubModule(FILES, 'DeckReview');
});

afterEach(() => {
   resetHubModules();
});

describe('DeckReview module wiring', () => {
   it('exposes core, data, picker, profile, decision, and render functions', () => {
      expect(typeof DR.getDeckById).toBe('function');
      expect(typeof DR.deriveSwapQueue).toBe('function');
      expect(typeof DR.deckCutOptions).toBe('function');
      expect(typeof DR.getDeckPreferences).toBe('function');
      expect(typeof DR.recordSuggestionDecision).toBe('function');
      expect(typeof DR.renderSuggestionPanel).toBe('function');
      expect(typeof window.loadDeckReviewApp).toBe('function');
   });
});

describe('DeckReview.deriveSwapQueue', () => {
   it('splits snapshot cards into New Set In/Out', () => {
      const queue = DR.deriveSwapQueue(deckWithSnapshot());
      expect(queue.new_set_in.map((c) => c.name)).toEqual(['New Card']);
      expect(queue.new_set_out.map((c) => c.name)).toEqual(['Old Card']);
   });

   it('returns null without a snapshot', () => {
      expect(DR.deriveSwapQueue({ deck_id: 'x' })).toBe(null);
   });
});

describe('DeckReview.getSuggestionStaleness', () => {
   it('flags suggestions already in the queue as fully queued', () => {
      const deck = deckWithSnapshot();
      const stale = DR.getSuggestionStaleness(deck, deck.suggestions[0]);
      expect(stale.stale).toBe(true);
      expect(stale.level).toBe('fully_queued');
   });
});

describe('DeckReview.deckCutOptions', () => {
   it('excludes swap-queue cards and includes regular cards', () => {
      const names = DR.deckCutOptions(deckWithSnapshot()).map((o) => o.name);
      expect(names).toContain('Sol Ring');
      expect(names).toContain('Cut Me');
      expect(names).not.toContain('New Card');
   });
});

describe('DeckReview.getDeckPreferences / isSuggestionFiltered', () => {
   it('merges profile preferences and filters blocked/protected suggestions', () => {
      const deck = deckWithSnapshot();
      DR.state.deckPrefs = {};
      const prefs = DR.getDeckPreferences(deck);
      expect(prefs.blocked_cards).toContain('Blocked Card');
      expect(prefs.protected_cards).toContain('Sol Ring');

      const blocked = { card: { name: 'Blocked Card' }, replaces: [] };
      const protectedOut = { card: { name: 'Fine' }, replaces: [{ name: 'Sol Ring' }] };
      const ok = { card: { name: 'Fine' }, replaces: [{ name: 'Whatever' }] };
      expect(DR.isSuggestionFiltered(blocked, prefs)).toBe(true);
      expect(DR.isSuggestionFiltered(protectedOut, prefs)).toBe(true);
      expect(DR.isSuggestionFiltered(ok, prefs)).toBe(false);
   });
});

describe('DeckReview.decisionStatusLabel / isMissingSuggestedCut', () => {
   it('returns status label markup', () => {
      expect(DR.decisionStatusLabel('accepted')).toContain('Accepted');
      expect(DR.decisionStatusLabel('pending')).toContain('Pending');
      expect(DR.decisionStatusLabel('')).toBe('');
   });

   it('detects missing cuts for non-sideboard suggestions', () => {
      expect(DR.isMissingSuggestedCut({ action: 'replace', replaces: [] })).toBe(true);
      expect(DR.isMissingSuggestedCut({ action: 'replace', replaces: [{ name: 'X' }] })).toBe(false);
      expect(DR.isMissingSuggestedCut({ action: 'sideboard', replaces: [] })).toBe(false);
   });
});

describe('DeckReview.acceptedForDeck', () => {
   it('collects accepted swap payloads from progress', () => {
      const deck = deckWithSnapshot();
      DR.state.data = { decks: [deck] };
      DR.state.progress = {
         decisions: {
            s1: { status: 'accepted', accepted: { card_in: { name: 'New Card' } } },
         },
      };
      const accepted = DR.acceptedForDeck('d1');
      expect(accepted).toHaveLength(1);
      expect(accepted[0].card_in.name).toBe('New Card');
   });
});
