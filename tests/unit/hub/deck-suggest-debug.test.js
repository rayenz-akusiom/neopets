import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHubModule, resetHubModules, REPO_ROOT } from '../helpers/hubHarness.js';

const FIXTURE_DIR = path.join(REPO_ROOT, 'tests/fixtures/deck-suggest');

const DS_FILES = [
   'shared/storage.js',
   'shared/hub-utils.js',
   'shared/swap-queue.js',
   'apps/deck-review/archidekt-export.js',
   'apps/order-reconcile/order-reconcile-export.js',
   'apps/deck-suggest/deck-suggest.js',
   'apps/deck-suggest/ds-rules-roles.js',
   'apps/deck-suggest/ds-tagger.js',
   'apps/deck-suggest/ds-rules-queue.js',
   'apps/deck-suggest/ds-rules-proxy.js',
   'apps/deck-suggest/ds-rules-debug.js',
   'apps/deck-suggest/ds-rules.js',
   'apps/deck-suggest/ds-data.js',
];

let DS;

function loadFixture(name) {
   return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

beforeEach(() => {
   resetHubModules();
   loadHubModule(DS_FILES, 'DeckSuggest');
   DS = window.DeckSuggest;
});

afterEach(() => {
   resetHubModules();
});

describe('HubUtils.isLocalHub', () => {
   it('returns true on localhost', () => {
      const original = window.location.hostname;
      Object.defineProperty(window.location, 'hostname', { value: 'localhost', configurable: true });
      expect(HubUtils.isLocalHub()).toBe(true);
      Object.defineProperty(window.location, 'hostname', { value: original, configurable: true });
   });

   it('returns false on github.io', () => {
      const original = window.location.hostname;
      Object.defineProperty(window.location, 'hostname', { value: 'rayenz.github.io', configurable: true });
      expect(HubUtils.isLocalHub()).toBe(false);
      Object.defineProperty(window.location, 'hostname', { value: original, configurable: true });
   });
});

describe('DeckSuggest.Debug', () => {
   it('rejectReason reports blocked_add', () => {
      const suggestion = {
         card: { name: 'Sol Ring' },
         replaces: [{ name: 'Plains' }],
      };
      const profile = { blocked_cards: ['Sol Ring'] };
      expect(DS.Debug.rejectReason(suggestion, profile, [])).toBe('blocked_add');
   });

   it('formatReason includes rule id and label', () => {
      const text = DS.Debug.formatReason({
         ruleId: 'queue_in_pair',
         subject: 'Sunbillow Verge',
         reason: 'not_in_set_scope',
      });
      expect(text).toContain('queue_in_pair');
      expect(text).toContain('Sunbillow Verge');
      expect(text).toContain('not in selected set pool');
   });

   it('explainCard reports not_in_set_scope for stale queue In', () => {
      const deck = loadFixture('baird-snapshot.json');
      const setScope = loadFixture('set-mh2-slice.json');
      const lines = DS.Debug.explainCard(deck, setScope, 'Sunbillow Verge');
      expect(lines.some((line) => line.reason === 'not_in_set_scope')).toBe(true);
   });
});

describe('runRulesForDeck debug trace', () => {
   it('returns debugTrace when debug option is true', () => {
      const deck = loadFixture('baird-snapshot.json');
      const setScope = loadFixture('set-mh2-slice.json');
      const output = DS.runRulesForDeck(deck, setScope, { debug: true });
      expect(output.debugTrace).toBeTruthy();
      expect(output.debugTrace.length).toBeGreaterThan(0);
      expect(output.debugTrace.some((e) => e.reason === 'not_in_set_scope')).toBe(true);
   });

   it('omits debugTrace when debug option is false', () => {
      const deck = loadFixture('baird-snapshot.json');
      const setScope = loadFixture('set-mh2-slice.json');
      const output = DS.runRulesForDeck(deck, setScope, { debug: false });
      expect(output.debugTrace).toBeNull();
   });
});

describe('DeckSuggest.rulesDebugEnabled', () => {
   it('is false when not on localhost even if setting is on', () => {
      const original = window.location.hostname;
      Object.defineProperty(window.location, 'hostname', { value: 'rayenz.github.io', configurable: true });
      DS.state.settings.rulesDebug = true;
      expect(DS.rulesDebugEnabled()).toBe(false);
      Object.defineProperty(window.location, 'hostname', { value: original, configurable: true });
   });

   it('is true on localhost when setting is on', () => {
      const original = window.location.hostname;
      Object.defineProperty(window.location, 'hostname', { value: 'localhost', configurable: true });
      DS.state.settings.rulesDebug = true;
      expect(DS.rulesDebugEnabled()).toBe(true);
      Object.defineProperty(window.location, 'hostname', { value: original, configurable: true });
   });
});
