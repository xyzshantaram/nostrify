import { NKinds } from '@nostrify/nostrify';
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

interface NEventDoc extends NostrEvent {
  pk: string;
  tagsIndex: string[];
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
    const tagsIndex: string[] = event.tags.map(([name, value]) => `${name}:${value}`);
    const task = await this.index.addDocuments([{ ...event, tagsIndex, pk }]);
    await this.client.waitForTask(task.taskUid);
  }

  async query(filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<NostrEvent[]> {
    const events: NostrEvent[] = [];

    for (const filter of filters) {
      const meiliFilters: string[] = [];

      if (filter.ids) {
        meiliFilters.push(`id IN ${JSON.stringify(filter.ids)}`);
      }
      if (filter.kinds) {
        meiliFilters.push(`kind IN ${JSON.stringify(filter.kinds)}`);
      }
      if (filter.authors) {
        meiliFilters.push(`pubkey IN ${JSON.stringify(filter.authors)}`);
      }
      if (typeof filter.since === 'number') {
        meiliFilters.push(`created_at >= ${filter.since}`);
      }
      if (typeof filter.until === 'number') {
        meiliFilters.push(`created_at <= ${filter.until}`);
      }

      for (const [key, values] of Object.entries(filter)) {
        if (key.startsWith('#') && Array.isArray(values)) {
          const name = key.replace(/^#/, '');
          meiliFilters.push(`tagsIndex IN ${JSON.stringify(values.map((value) => `${name}:${value}`))}`);
        }
      }

      const { hits } = await this.index.search(filter.search, {
        filter: meiliFilters,
        sort: ['created_at:desc', 'id:asc'],
        limit: filter.limit,
      });

      for (const hit of hits) {
        const { id, kind, pubkey, content, tags, created_at, sig } = hit;
        events.push({ id, kind, pubkey, content, tags, created_at, sig });
      }
    }

    return events;
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

  get index(): Index<NEventDoc> {
    const { uid = 'nostr_events' } = this.opts;
    return this.client.index<NEventDoc>(uid);
  }

  async migrate(): Promise<void> {
    const { uid = 'nostr_events' } = this.opts;

    const tasks: EnqueuedTask[] = [];

    tasks.push(await this.client.createIndex(uid, { primaryKey: 'pk' }));
    tasks.push(await this.index.updateFilterableAttributes(['id', 'kind', 'pubkey', 'created_at', 'tagsIndex']));
    tasks.push(await this.index.updateSortableAttributes(['created_at', 'id']));

    await this.client.waitForTasks(tasks.map((task) => task.taskUid));
  }

  close(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
