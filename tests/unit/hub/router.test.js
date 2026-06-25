import { describe, expect, it } from 'vitest';
import { setupHub } from '../helpers/hubHarness.js';

describe('hub router', () => {
   it('defaults empty hash to the dailies route', async () => {
      const hub = await setupHub();
      expect(hub.getRoutePath()).toBe('/dailies');
      expect(hub.getCollapsibles().length).toBeGreaterThan(0);
   });

   it('navigates to deck review and back', async () => {
      const hub = await setupHub();
      await hub.navigate('#/deck-review');
      expect(hub.getRoutePath()).toBe('/deck-review');
      expect(document.querySelector('.deck-review-stub')).toBeTruthy();

      await hub.navigate('#/dailies');
      expect(hub.getRoutePath()).toBe('/dailies');
      expect(hub.getCollapsibles().length).toBeGreaterThan(0);
   });
});
