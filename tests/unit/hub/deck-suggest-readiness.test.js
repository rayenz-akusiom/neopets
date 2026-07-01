import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHubModule, resetHubModules } from '../helpers/hubHarness.js';

const MODULES = [
   'shared/storage.js',
   'shared/hub-utils.js',
   'shared/hub-progress.js',
   'shared/swap-queue.js',
   'apps/deck-review/archidekt-export.js',
   'apps/order-reconcile/order-reconcile-export.js',
   'apps/deck-suggest/deck-suggest.js',
   'apps/deck-suggest/ds-data.js',
   'apps/deck-suggest/ds-export.js',
   'apps/deck-suggest/ds-render.js',
];

let DS;

function readyState(overrides = {}) {
   const base = {
      setScope: {
         complete: true,
         codes: ['MSH'],
         codesKey: 'MSH',
         cards: [{ name: 'Test Card' }],
         source: 'scryfall',
      },
      deckSelection: {
         decks: [{ deck_id: 'd1', deck_name: 'Deck One' }],
         selectedIds: ['d1'],
      },
      ui: { setCodesInput: 'MSH' },
      generating: false,
   };
   return Object.assign(base, overrides);
}

beforeEach(() => {
   resetHubModules();
   loadHubModule(MODULES);
   DS = window.DeckSuggest;
});

afterEach(() => {
   resetHubModules();
   delete window.RayenzArchidektBridge;
   document.body.innerHTML = '';
});

describe('DeckSuggest.getGenerateReadiness', () => {
   it('returns ok when set pool, decks, and selection are ready', () => {
      const result = DS.getGenerateReadiness(readyState());
      expect(result.ok).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.items.every((i) => i.ok)).toBe(true);
   });

   it('fails when set pool is missing', () => {
      const result = DS.getGenerateReadiness(readyState({ setScope: null }));
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('set');
   });

   it('fails when set pool is incomplete', () => {
      const scope = readyState().setScope;
      scope.complete = false;
      const result = DS.getGenerateReadiness(readyState({ setScope: scope }));
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('set');
   });

   it('fails when set codes input does not match loaded scope', () => {
      const result = DS.getGenerateReadiness(readyState({ ui: { setCodesInput: 'MH2' } }));
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('set');
   });

   it('fails when no decks are loaded', () => {
      const result = DS.getGenerateReadiness(readyState({
         deckSelection: { decks: [], selectedIds: [] },
      }));
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('decks');
      expect(result.missing).toContain('selection');
   });

   it('fails when decks exist but none selected', () => {
      const result = DS.getGenerateReadiness(readyState({
         deckSelection: {
            decks: [{ deck_id: 'd1', deck_name: 'Deck One' }],
            selectedIds: [],
         },
      }));
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('selection');
      expect(result.missing).not.toContain('decks');
   });

   it('fails when generating even if requirements are met', () => {
      const result = DS.getGenerateReadiness(readyState({ generating: true }));
      expect(result.ok).toBe(false);
      expect(result.generating).toBe(true);
   });

   it('allows generate readiness to fail without set while decks can still load', () => {
      const result = DS.getGenerateReadiness(readyState({ setScope: null }));
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('set');
      expect(result.missing).not.toContain('decks');
   });
});

describe('DeckSuggest setup controls without set pool', () => {
   it('enables folder controls when bridge is available and set pool is missing', () => {
      window.RayenzArchidektBridge = { isAvailable: true };
      document.body.innerHTML = '<div id="ds-setup"></div>';
      DS.state.setScope = null;
      DS.state.settings = DS.state.settings || {};
      DS.state.ui = {
         setupEl: document.getElementById('ds-setup'),
         setCodesInput: 'MSH',
         deckLoadTab: 'folder',
      };
      DS.Render.renderSetup();

      const folderTab = document.querySelector('[data-deck-tab="folder"]');
      const loadFolderBtn = document.getElementById('ds-load-folder');
      expect(folderTab.disabled).toBe(false);
      expect(loadFolderBtn.disabled).toBe(false);
      expect(DS.getGenerateReadiness(DS.state).ok).toBe(false);
   });
});
