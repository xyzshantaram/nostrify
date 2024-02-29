import { assertEquals } from 'https://deno.land/std@0.212.0/assert/mod.ts';

import { NKinds } from './NKinds.ts';
import { NSchema as n } from './NSchema.ts';
import { NTagIndexer } from './NTagIndexer.ts';

Deno.test('NTagIndexer', () => {
  const indexer = NTagIndexer({
    'd': ({ event, count }) => count === 0 && NKinds.parameterizedReplaceable(event.kind),
    'e': ({ count, value }) => (count < 15) && n.id().safeParse(value).success,
    'p': ({ event, count, value }) => (count < 15 || event.kind === 3) && n.id().safeParse(value).success,
  });

  const event = {
    kind: 1,
    tags: [
      ['e', '978bc0a7635c8331f6ec8dd211baf3b40f21d99e2ac8942fdbc32c4de5025831'],
      ['p', 'ab2f4c51ddf86bfab11711da00bbdd959272755f98477ab125991922f17a1740'],
      ['q', '4'],
    ],
    pubkey: '',
    content: '',
    created_at: 0,
    id: '',
    sig: '',
  };

  assertEquals(indexer(event), [
    ['e', '978bc0a7635c8331f6ec8dd211baf3b40f21d99e2ac8942fdbc32c4de5025831'],
    ['p', 'ab2f4c51ddf86bfab11711da00bbdd959272755f98477ab125991922f17a1740'],
  ]);
});
