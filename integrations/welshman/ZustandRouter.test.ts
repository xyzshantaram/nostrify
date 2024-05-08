import { assertEquals } from '@std/assert';

import { ZustandRouter } from './ZustandRouter.ts';

Deno.test('ZustandRouter', () => {
  const router = new ZustandRouter();

  router.addPubkeyRelay('wss://relay.mostr.pub', 'alex');

  assertEquals(router.getPubkeySelection('alex'), {
    value: 'alex',
    relays: ['wss://relay.mostr.pub'],
  });
});
