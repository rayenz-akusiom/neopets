import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHubModule, resetHubModules } from '../helpers/hubHarness.js';

let Parse;

beforeEach(() => {
   resetHubModules();
   Parse = loadHubModule('apps/order-reconcile/email-parse.js', 'OrderEmailParse');
});

afterEach(() => {
   resetHubModules();
});

describe('OrderEmailParse.parseCardLine', () => {
   it('parses quantity-prefixed lines with set and collector number', () => {
      expect(Parse.parseCardLine('2x Sol Ring (cmm) 1')).toMatchObject({
         name: 'Sol Ring',
         quantity: 2,
         set_code: 'cmm',
         collector_number: '1',
      });
   });

   it('parses a leading-quantity line without the x separator', () => {
      expect(Parse.parseCardLine('3 Llanowar Elves')).toMatchObject({
         name: 'Llanowar Elves',
         quantity: 3,
      });
   });

   it('defaults quantity to 1 for a bare name', () => {
      expect(Parse.parseCardLine('Mana Crypt')).toMatchObject({
         name: 'Mana Crypt',
         quantity: 1,
      });
   });

   it('extracts a standalone foil keyword and strips it from the name', () => {
      const parsed = Parse.parseCardLine('1x Sol Ring foil');
      expect(parsed.finish).toBe('foil');
      expect(parsed.name).toBe('Sol Ring');
   });

   it('parses set-only printings', () => {
      expect(Parse.parseCardLine('1x Sol Ring (cmm)')).toMatchObject({
         name: 'Sol Ring',
         set_code: 'cmm',
         collector_number: null,
      });
   });

   it('ignores comments, blanks, and totals', () => {
      expect(Parse.parseCardLine('')).toBe(null);
      expect(Parse.parseCardLine('# a comment')).toBe(null);
      expect(Parse.parseCardLine('Total: $20')).toBe(null);
   });
});

describe('OrderEmailParse.parseCardList', () => {
   it('parses multiple lines and assigns ids', () => {
      const result = Parse.parseCardList('2x Sol Ring (cmm) 1\n1 Llanowar Elves');
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].id).toBe('acq-0');
      expect(result.cards[1].id).toBe('acq-1');
   });
});

describe('OrderEmailParse.parseOrderEmail', () => {
   it('keeps likely card lines and skips prose', () => {
      const email = [
         'Hello, thanks for your order!',
         '2x Sol Ring (cmm) 1',
         'Shipping: $5',
         '1x Mana Crypt (2xm) 270',
      ].join('\n');
      const result = Parse.parseOrderEmail(email);
      expect(result.cards.map((c) => c.name)).toEqual(['Sol Ring', 'Mana Crypt']);
      expect(result.skippedNonCardLines.length).toBeGreaterThan(0);
   });
});

describe('OrderEmailParse.mergeAcquiredCards', () => {
   it('merges duplicate cards by name/set/collector/finish and sums quantity', () => {
      const merged = Parse.mergeAcquiredCards([
         { name: 'Sol Ring', set_code: 'cmm', collector_number: '1', finish: null, quantity: 1 },
         { name: 'Sol Ring', set_code: 'cmm', collector_number: '1', finish: null, quantity: 2 },
      ]);
      expect(merged).toHaveLength(1);
      expect(merged[0].quantity).toBe(3);
   });

   it('keeps different finishes separate', () => {
      const merged = Parse.mergeAcquiredCards([
         { name: 'Sol Ring', set_code: 'cmm', collector_number: '1', finish: null, quantity: 1 },
         { name: 'Sol Ring', set_code: 'cmm', collector_number: '1', finish: 'foil', quantity: 1 },
      ]);
      expect(merged).toHaveLength(2);
   });
});
