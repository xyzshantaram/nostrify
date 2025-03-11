import { NKinds, NSet } from '@nostrify/nostrify';
import { type EnqueuedTask, type Index, MeiliSearch } from 'meilisearch';

import type {
  NostrEvent,
  NostrFilter,
  NostrRelayCLOSED,
  NostrRelayCOUNT,
  NostrRelayEOSE,
  NostrRelayEVENT,
  NRelay,
} from '@nostrify/types';

export interface NMeiliOpts {
  uid?: string;
}

export class NMeili implements NRelay {
  constructor(private client: MeiliSearch, private opts: NMeiliOpts = {}) {}

  req(
    _filters: NostrFilter[],
    _opts?: { signal?: AbortSignal },
  ): AsyncIterable<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED> {
    throw new Error('Method not implemented.');
  }

  async event(event: NostrEvent, _opts?: { signal?: AbortSignal }): Promise<void> {
    const pk = this.pk(event);
    const task = await this.index.addDocuments([{ ...event, pk }]);
    await this.client.waitForTask(task.taskUid);
  }

  async query(filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<NostrEvent[]> {
    const events = new NSet();

    for (const filter of filters) {
      const meiliFilters: string[] = [];

      if (filter.kinds) {
        meiliFilters.push(`kind IN ${JSON.stringify(filter.kinds)}`);
      }

      const { hits } = await this.index.search(undefined, {
        filter: meiliFilters.join(' AND '),
        limit: filter.limit,
      });

      for (const hit of hits) {
        const { id, kind, pubkey, content, tags, created_at, sig } = hit;
        events.add({ id, kind, pubkey, content, tags, created_at, sig });
      }
    }

    return [...events];
  }

  count(_filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<NostrRelayCOUNT[2]> {
    throw new Error('Method not implemented.');
  }

  remove(_filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<void> {
    throw new Error('Method not implemented.');
  }

  pk(event: NostrEvent): string {
    const { id, kind, pubkey, tags } = event;

    if (NKinds.replaceable(kind)) {
      return [kind, pubkey, ''].join(':');
    }

    if (NKinds.parameterizedReplaceable(kind)) {
      const d = tags.find(([name]) => name === 'd')?.[1];
      return [kind, pubkey, d].join(':');
    }

    return id;
  }

  get index(): Index<NostrEvent & { pk: string }> {
    const { uid = 'nostr_events' } = this.opts;
    return this.client.index<NostrEvent>(uid);
  }

  async migrate(): Promise<void> {
    const { uid = 'nostr_events' } = this.opts;

    const tasks: EnqueuedTask[] = [];

    tasks.push(await this.client.createIndex(uid, { primaryKey: 'pk' }));
    tasks.push(await this.index.updateFilterableAttributes(['kind', 'pubkey', 'created_at']));

    await this.client.waitForTasks(tasks.map((task) => task.taskUid));
  }

  close(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
