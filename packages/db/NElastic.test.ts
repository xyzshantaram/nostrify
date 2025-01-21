import { assertEquals, assertRejects } from '@std/assert';
import event0 from '../../fixtures/event-0.json' with { type: 'json' };
import event1 from '../../fixtures/event-1.json' with { type: 'json' };
import PR_EVENTS from '../../fixtures/parameterized-replaceable-events.json' with { type: 'json' };
import { NElastic } from './NElastic.ts';
import { Client } from 'elasticsearch';

const client = new Client({
  node: 'http://localhost:9200',
});

await client.indices.delete({
  index: 'nostr_events',
});

const instance = new NElastic(client);
await instance.migrate();

Deno.test('NElastic.count', async (t) => {
  await t.step('make sure no events exist', async () => {
    assertEquals((await instance.count([{ kinds: [1] }])).count, 0);
  });

  await instance.event(event1);

  await t.step('make sure one event exists after inserting', async () => {
    assertEquals((await instance.count([{ kinds: [1] }])).count, 1);
  });
});

Deno.test('NElastic.query', async (t) => {
  await instance.event(event1);

  await t.step('should find by kind', async () => {
    assertEquals(await instance.query([{ kinds: [1] }]), [event1]);
  });

  await t.step('should not find nonexistent by kind', async () => {
    assertEquals(await instance.query([{ kinds: [3] }]), []);
  });

  await t.step('should find by since', async () => {
    assertEquals(await instance.query([{ since: 1691091363 }]), [event1]);
  });

  await t.step('should not find by until if not exists', async () => {
    assertEquals(await instance.query([{ until: 1691091364 }]), []);
  });

  await t.step('should find by tag', async () => {
    assertEquals(
      await instance.query([{ '#t': ['t for testing'] }]),
      [event1],
    );
  });
});

Deno.test("NElastic.query with multiple tags doesn't crash", async () => {
  await instance.query([{
    kinds: [1985],
    authors: ['c87e0d90c7e521967a6975439ba20d9052c2b6680d8c4c80fc2943e2c726d98c'],
    '#L': ['nip05'],
    '#l': ['alex@gleasonator.com'],
  }]);
});

Deno.test('NElastic.remove', async () => {
  await instance.event(event1);
  assertEquals(await instance.query([{ kinds: [1] }]), [event1]);
  await instance.remove([{ kinds: [1] }]);
  assertEquals(await instance.query([{ kinds: [1] }]), []);
});

Deno.test('NElastic.event with a deleted event', async (t) => {
  await instance.event(event1);
  assertEquals(await instance.query([{ kinds: [1] }]), [event1]);

  await t.step('ensure kind 5 events delete old events', async () => {
    await instance.event({
      kind: 5,
      pubkey: event1.pubkey,
      tags: [['e', event1.id]],
      created_at: 0,
      content: '',
      id: 'foobar',
      sig: 'sig',
    });

    assertEquals(await instance.query([{ kinds: [1] }]), []);
  });

  await t.step('ensure deletions are permanent and respected in future', async () => {
    await assertRejects(() => instance.event(event1));
    assertEquals(await instance.query([{ kinds: [1] }]), []);
  });
});

Deno.test('NElastic.event with replaceable event', async (t) => {
  await t.step('ensure no kind 0 events exist', async () => {
    assertEquals((await instance.count([{ kinds: [0], authors: [event0.pubkey] }])).count, 0);
  });

  await t.step('put kind 0 event and ensure putting it again fails', async () => {
    await instance.event(event0);
    await assertRejects(() => instance.event(event0));
  });

  await t.step('ensure only 1 kind 0 event exists', async () => {
    assertEquals((await instance.count([{ kinds: [0], authors: [event0.pubkey] }])).count, 1);
  });

  await t.step('ensure that replacing puts only one event in database', async () => {
    const changeEvent = { ...event0, id: '123', created_at: event0.created_at + 1 };
    await instance.event(changeEvent);
    assertEquals(await instance.query([{ kinds: [0] }]), [changeEvent]);
  });
});

Deno.test('NElastic.event with parameterized replaceable event', async (t) => {
  const [first, second, third] = PR_EVENTS;

  await t.step('should insert replaceable event', async () => {
    await instance.event(first);
    assertEquals(await instance.query([{ ids: [first.id] }]), [first]);
  });

  await t.step('should delete old event when inserting new event', async () => {
    await instance.event(second);
    assertEquals(await instance.query([{ ids: [first.id] }]), []);
  });

  await t.step('new event should be inserted correctly', async () => {
    assertEquals(await instance.query([{ ids: [second.id] }]), [second]);
  });

  await t.step('repeat with a third event', async () => {
    await instance.event(third);
    assertEquals(await instance.query([{ ids: [first.id, second.id] }]), []);
    assertEquals(await instance.query([{ ids: [third.id] }]), [third]);
  });
});
