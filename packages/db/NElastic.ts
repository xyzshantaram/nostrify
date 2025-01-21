import { NKinds } from '@nostrify/nostrify';
import {
  NostrEvent,
  NostrFilter,
  NostrRelayCLOSED,
  NostrRelayCOUNT,
  NostrRelayEOSE,
  NostrRelayEVENT,
  NRelay,
  NStore,
} from '@nostrify/types';
import esb from 'elastic-builder';
import { Client } from 'elasticsearch';

interface SearchTotalHits {
  relation: 'eq' | 'gte';
  value: number;
}

const INDEX_SCHEMA = {
  index: 'nostr_events',
  body: {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      dynamic: false,
      properties: {
        event: {
          dynamic: false,
          properties: {
            id: { type: 'keyword' },
            pubkey: { type: 'keyword' },
            kind: { type: 'integer' },
            tags: { type: 'keyword' },
            created_at: { type: 'date' },
          },
        },
        content_search: { type: 'text' },
      },
    },
  },
};

export class NElastic implements NRelay {
  static hitsCount(n: SearchTotalHits | number | undefined): number {
    if (typeof n === 'number') return n;
    if (typeof n === 'object') {
      return n.value;
    }
    throw new Error('Hits count not present');
  }

  static findTag(e: NostrEvent, t: string): string[] | undefined {
    return e.tags.find((itm) => itm[0] === 't');
  }

  static replaceableEventsQuery(event: NostrEvent, addressable: boolean) {
    const doesPriorEventExist = esb.requestBodySearch().query(
      esb.boolQuery()
        .must(esb.rangeQuery('created_at').lt(event.created_at))
        .must(esb.termQuery('pubkey', event.pubkey))
        .must(esb.termQuery('kind', event.kind)),
    );

    if (addressable) {
      const dTag = NElastic.findTag(event, 'd');
      if (!dTag) return;
      // @ts-ignore if aTag is undefined then we wouldn't be here at all
      doesPriorEventExist.must(esb.matchQuery('tags', `["d",${dTag[1]}`));
    }

    console.log(JSON.stringify(doesPriorEventExist.toJSON()));
    return doesPriorEventExist;
  }

  client: Client;
  constructor(client: Client) {
    this.client = client;

    client.info().then(console.debug);
  }

  async migrate() {
    try {
      const result = await this.client.indices.create(INDEX_SCHEMA);
      console.debug(result);
    } catch (e: any) {
      if (typeof e.message === 'string') {
        if (!e.message.includes('resource_already_exists')) throw e;
      }
    }
  }

  req(
    filters: NostrFilter[],
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED> {
    throw new Error('Method not implemented.');
  }
  close(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async event(event: NostrEvent, opts?: { signal?: AbortSignal }): Promise<void> {
    if (NKinds.ephemeral(event.kind)) return;

    if (await this.isDeleted(event)) {
      throw new Error('Cannot add a deleted event');
    }

    if (event.kind === 5) {
      const etag = NElastic.findTag(event, 'e');
      if (!etag) return;
      this.client.delete({ id: etag[1], index: 'nostr_events' });
    }

    const addressable = NKinds.addressable(event.kind);
    if (NKinds.replaceable(event.kind) || addressable) {
      const query = NElastic.replaceableEventsQuery(event, addressable);
      if (!query) return;
      const res = await this.client.search({ index: 'nostr_events', body: query.toJSON(), size: 1 });
      console.log(res.hits.hits);
    }

    await this.client.index({
      id: event.id,
      index: 'nostr_events',
      document: event,
    });
  }
  async isDeleted(event: NostrEvent): Promise<boolean> {
    const query = esb.requestBodySearch().query(
      esb
        .boolQuery()
        .must(esb.termQuery('kind', 5))
        .must(esb.matchQuery('pubkey', event.pubkey))
        .must(esb.matchQuery('tags', `["e","${event.id}"]`)),
    );

    const result = await this.client.search({ index: 'nostr_events', body: query.toJSON(), size: 0 });
    const hits = NElastic.hitsCount(result.hits.total);
    return hits !== 0;
  }
  query(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrEvent[]> {
    throw new Error('Method not implemented.');
  }
  count(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrRelayCOUNT[2]> {
    throw new Error('Method not implemented.');
  }
  remove(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
