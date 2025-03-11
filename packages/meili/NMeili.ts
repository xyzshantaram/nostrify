import type {
  NostrEvent,
  NostrFilter,
  NostrRelayCLOSED,
  NostrRelayCOUNT,
  NostrRelayEOSE,
  NostrRelayEVENT,
  NRelay,
} from '@nostrify/types';
import type { MeiliSearch } from 'meilisearch';

export class NMeili implements NRelay {
  constructor(private client: MeiliSearch) {}

  req(
    _filters: NostrFilter[],
    _opts?: { signal?: AbortSignal },
  ): AsyncIterable<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED> {
    throw new Error('Method not implemented.');
  }

  async event(event: NostrEvent, _opts?: { signal?: AbortSignal }): Promise<void> {
    const index = this.client.index('nostr_events');
    await index.addDocuments([event]);
  }

  query(_filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<NostrEvent[]> {
    throw new Error('Method not implemented.');
  }

  count(_filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<NostrRelayCOUNT[2]> {
    throw new Error('Method not implemented.');
  }

  remove(_filters: NostrFilter[], _opts?: { signal?: AbortSignal }): Promise<void> {
    throw new Error('Method not implemented.');
  }

  close(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
