import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';

import { NostrEvent } from '../../interfaces/NostrEvent.ts';
import { NostrFilter } from '../../interfaces/NostrFilter.ts';
import { NostrRelayCLOSED, NostrRelayEOSE, NostrRelayEVENT } from '../../interfaces/NostrRelayMsg.ts';
import { NRelay } from '../../interfaces/NRelay.ts';

/**
 * NDK storage adapter.
 *
 * Pass your NDK instance to create an `NStore` that can be used intechangably with other storages on Nostrify.
 */
export class NDKStore implements NRelay {
  private ndk: NDK;

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }

  async event(event: NostrEvent): Promise<void> {
    await new NDKEvent(this.ndk, event).publish();
  }

  async *req(
    filters: NostrFilter[],
    opts: { signal?: AbortSignal } = {},
  ): AsyncIterable<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED> {
    if (opts.signal?.aborted) throw new DOMException('The signal has been aborted', 'AbortError');

    const subId = crypto.randomUUID();
    const sub = this.ndk.subscribe(filters, { closeOnEose: true, subId });

    const stream = new ReadableStream<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED>({
      start(controller) {
        sub.on('event', (event: NDKEvent) => {
          controller.enqueue(['EVENT', subId, event.rawEvent() as NostrEvent]);
        });

        sub.on('eose', () => {
          controller.enqueue(['EOSE', subId]);
          controller.close();
        });
      },
    });

    const abort = () => {
      sub.stop();
      stream.cancel();
      cleanup();
    };

    const cleanup = () => {
      sub.removeAllListeners();
      opts.signal?.removeEventListener('abort', abort);
    };

    opts.signal?.addEventListener('abort', abort);

    try {
      for await (const msg of stream.values()) {
        yield msg;
      }
    } finally {
      abort();
    }
  }

  async query(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrEvent[]> {
    const events: NostrEvent[] = [];

    for await (const msg of this.req(filters, opts)) {
      if (msg[0] === 'EOSE') break;
      if (msg[0] === 'EVENT') events.push(msg[2]);
    }

    return events;
  }
}
