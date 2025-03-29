import { assertEquals } from '@std/assert';
import { finalizeEvent, generateSecretKey } from 'nostr-tools';

import { RegexPolicy } from './RegexPolicy.ts';

Deno.test('RegexPolicy', async () => {
  const event = finalizeEvent(
    { kind: 1, content: '🔥🔥🔥 https://t.me/spam 我想死', tags: [], created_at: 0 },
    generateSecretKey(),
  );

  assertEquals((await new RegexPolicy({ expr: 'https://t\.me/\\w+', flags: 'i' }).call(event))[2], false);
  assertEquals((await new RegexPolicy({ expr: '🔥{1,3}' }).call(event))[2], false);
  assertEquals((await new RegexPolicy({ expr: '🔥{4}' }).call(event))[2], true);
  assertEquals((await new RegexPolicy({ expr: '🔥$' }).call(event))[2], true);
  assertEquals((await new RegexPolicy({ expr: '^🔥' }).call(event))[2], false);
});
