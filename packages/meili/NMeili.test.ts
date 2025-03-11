import { genEvent } from '@nostrify/nostrify/test';
import { assertEquals } from '@std/assert';
import { MeiliSearch } from 'meilisearch';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

import { NMeili } from './NMeili.ts';

Deno.test('NMeili', async (t) => {
  const client = new MeiliSearch({ host: 'http://localhost:7700' });
  const relay = new NMeili(client);

  await client.deleteIndexIfExists('nostr_events');
  await relay.migrate();

  await t.step('event', async () => {
    const event = genEvent({ kind: 1, content: 'hello world!' });
    await relay.event(event);
  });

  await t.step('query', async () => {
    const events = await relay.query([{ kinds: [1] }]);

    assertEquals(events.length, 1);
    assertEquals(events[0].content, 'hello world!');
  });
});

Deno.test('NMeili.query by pubkey', async () => {
  const client = new MeiliSearch({ host: 'http://localhost:7700' });
  const relay = new NMeili(client);

  await client.deleteIndexIfExists('nostr_events');
  await relay.migrate();

  const sk = generateSecretKey();
  const pubkey = getPublicKey(sk);

  await relay.event(genEvent({ kind: 1, content: 'spaghetti' }, sk));
  await relay.event(genEvent({ kind: 1, content: 'eggplant' }));

  const events = await relay.query([{ authors: [pubkey] }]);

  assertEquals(events.length, 1);
  assertEquals(events[0].content, 'spaghetti');
});

Deno.test('NMeili.query by tag', async () => {
  const client = new MeiliSearch({ host: 'http://localhost:7700' });
  const relay = new NMeili(client);

  await client.deleteIndexIfExists('nostr_events');
  await relay.migrate();

  const event = genEvent({ tags: [['hi', 'hello']] });

  await relay.event(event);

  const events = await relay.query([{ '#hi': ['hello'] }]);

  assertEquals(events.length, 1);
  assertEquals(events[0].tags[0][1], 'hello');
});
