import { describe, expect, it } from 'vitest';
import { setupHub } from '../helpers/hubHarness.js';

describe('dailies re-init after navigation', () => {
   it('re-binds collapsible click handlers after returning from deck review', async () => {
      const hub = await setupHub();
      const firstLoad = hub.getCollapsibles()[0];

      expect(firstLoad).toBeTruthy();
      expect(firstLoad.classList.contains('active')).toBe(true);

      await hub.navigate('#/deck-review');
      await hub.navigate('#/dailies');

      const afterReturn = hub.getCollapsibles()[0];
      expect(afterReturn).toBeTruthy();
      expect(afterReturn).not.toBe(firstLoad);
      expect(afterReturn.classList.contains('active')).toBe(true);

      afterReturn.click();
      expect(afterReturn.classList.contains('active')).toBe(false);

      afterReturn.click();
      expect(afterReturn.classList.contains('active')).toBe(true);
   });
});
