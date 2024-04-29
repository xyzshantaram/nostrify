// deno-lint-ignore-file require-await

import { matchFilters } from 'nostr-tools';

import { NostrEvent } from '../../interfaces/NostrEvent.ts';
import { NostrFilter } from '../../interfaces/NostrFilter.ts';
import { NostrRelayCLOSED, NostrRelayCOUNT, NostrRelayEOSE, NostrRelayEVENT } from '../../interfaces/NostrRelayMsg.ts';
import { NRelay } from '../../interfaces/NRelay.ts';

import { NSet } from '../NSet.ts';

/** Mock relay for testing. */
export class MockRelay extends NSet implements NRelay {
  private subs = new Map<string, { filters: NostrFilter[]; controller: ReadableStreamDefaultController<NostrEvent> }>();

  async *req(filters: NostrFilter[]): AsyncIterable<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED> {
    const uuid = crypto.randomUUID();

    const stream = new ReadableStream<NostrEvent>({
      start: (controller) => {
        this.subs.set(uuid, { filters, controller });
      },
    });

    try {
      for (const event of await this.query(filters)) {
        yield ['EVENT', uuid, event];
      }

      yield ['EOSE', uuid];

      for await (const event of stream.values()) {
        yield ['EVENT', uuid, event];
      }
    } finally {
      this.subs.delete(uuid);
    }
  }

  async event(event: NostrEvent): Promise<void> {
    this.add(event);

    for (const { filters, controller } of this.subs.values()) {
      if (matchFilters(filters, event)) {
        controller.enqueue(event);
      }
    }
  }

  async query(filters: NostrFilter[]): Promise<NostrEvent[]> {
    const events: NostrEvent[] = [];

    for (const event of this) {
      if (matchFilters(filters, event)) {
        this.cache.get(event.id);
        events.push(event);
      }
    }

    return events;
  }

  async remove(filters: NostrFilter[]): Promise<void> {
    for (const event of this) {
      if (matchFilters(filters, event)) {
        this.delete(event);
      }
    }
  }

  async count(filters: NostrFilter[]): Promise<NostrRelayCOUNT[2]> {
    const events = await this.query(filters);
    return {
      count: events.length,
      approximate: false,
    };
  }

  [Symbol.toStringTag] = 'MockRelay';
}
