import { assertEquals } from 'https://deno.land/std@0.212.0/assert/mod.ts';

import { Machina } from './Machina.ts';

Deno.test('push, iterate, & close', async () => {
  const results = [];
  const machina = new Machina<number>();
  const controller = new AbortController();

  machina.push(1);
  machina.push(2);
  setTimeout(() => machina.push(3), 100);

  for await (const msg of machina.stream(controller.signal)) {
    results.push(msg);

    if (results.length === 3) {
      controller.abort();
    }
  }

  assertEquals(results, [1, 2, 3]);
});

Deno.test('close & reopen', async () => {
  const machina = new Machina<number>();
  const controller = new AbortController();

  machina.push(777);
  for await (const msg of machina.stream(controller.signal)) {
    assertEquals(msg, 777);
    controller.abort();
  }

  const controller2 = new AbortController();

  machina.push(888);
  for await (const msg of machina.stream(controller2.signal)) {
    assertEquals(msg, 888);
    controller2.abort();
  }
});
