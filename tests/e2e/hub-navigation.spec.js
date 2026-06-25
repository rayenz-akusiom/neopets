import { expect, test } from '@playwright/test';

test('dailies collapsibles work after navigating away and back', async ({ page }) => {
   await page.goto('/');

   const collapsible = page.locator('#app-root .collapsible').first();
   await expect(collapsible).toBeVisible();
   await expect(collapsible).toHaveClass(/active/);

   await page.getByRole('link', { name: 'Deck Review' }).click();
   await expect(page.locator('.deck-review-app')).toBeVisible();

   await page.getByRole('link', { name: 'Dailies' }).click();
   const collapsibleAfterReturn = page.locator('#app-root .collapsible').first();
   await expect(collapsibleAfterReturn).toBeVisible();
   await expect(collapsibleAfterReturn).toHaveClass(/active/);

   await collapsibleAfterReturn.click();
   await expect(collapsibleAfterReturn).not.toHaveClass(/active/);

   await collapsibleAfterReturn.click();
   await expect(collapsibleAfterReturn).toHaveClass(/active/);
});
