import { genEvent } from '@nostrify/nostrify/test';
import { MeiliSearch } from 'meilisearch';

import { NMeili } from './NMeili.ts';

Deno.test('NMeili', async () => {
  const client = new MeiliSearch({ host: 'http://localhost:7700' });
  const relay = new NMeili(client);

  const event = genEvent({ kind: 1, content: 'hello worl!' });

  await relay.event(event);
});
