import { DefaultEventMap, EventEmitter } from 'npm:tseep@^1.2.1';
import { matchFilters, verifyEvent } from 'npm:nostr-tools@^2.1.4';

import { NostrClientCOUNT, NostrClientMsg, NostrClientREQ } from '../interfaces/NostrClientMsg.ts';
import { NostrEvent } from '../interfaces/NostrEvent.ts';
import { NostrFilter } from '../interfaces/NostrFilter.ts';
import {
  NostrRelayCLOSED,
  NostrRelayCOUNT,
  NostrRelayEOSE,
  NostrRelayEVENT,
  NostrRelayOK,
} from '../interfaces/NostrRelayMsg.ts';
import { NRelay, NReqOpts } from '../interfaces/NRelay.ts';
import { NStoreOpts } from '../interfaces/NStore.ts';

import { Machina } from './Machina.ts';
import { NSchema as n } from './NSchema.ts';

interface NSocketOpts {
  log?: Console['log'];
}

type NSocketEventMap = DefaultEventMap & {
  [key: `req:${string}`]: (msg: NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED) => void;
  [key: `event:${string}`]: (msg: NostrRelayOK) => void;
  [key: `count:${string}`]: (msg: NostrRelayCOUNT) => void;
};

export class NSocket extends WebSocket implements NRelay {
  #ee = new EventEmitter<NSocketEventMap>();
  #log: Console['log'];

  constructor(url: string | URL, protocols?: string | string[], opts?: NSocketOpts) {
    super(url, protocols);
    this.#log = opts?.log ?? console.log;
    this.addEventListener('message', this.onMessage);
  }

  protected onMessage(ev: MessageEvent) {
    const result = n.json().pipe(n.relayMsg()).safeParse(ev.data);
    if (result.success) {
      const msg = result.data;
      switch (msg[0]) {
        case 'EVENT':
        case 'EOSE':
        case 'CLOSED':
          this.#ee.emit(`req:${msg[1]}`, msg);
          break;
        case 'OK':
          this.#ee.emit(`event:${msg[1]}`, msg);
          break;
        case 'COUNT':
          this.#ee.emit(`count:${msg[1]}`, msg);
          break;
        case 'NOTICE':
          this.#log(msg[1]);
      }
    }
  }

  protected msg(msg: NostrClientMsg): void {
    this.send(JSON.stringify(msg));
  }

  req(filters: NostrFilter[], opts?: NReqOpts): AsyncGenerator<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED> {
    const uuid = opts?.subscriptionId ?? crypto.randomUUID();
    const req: NostrClientREQ = ['REQ', uuid, ...filters];

    this.msg(req);

    const machina = new Machina<NostrRelayEVENT | NostrRelayEOSE | NostrRelayCLOSED>();

    this.#ee.on(`req:${req[1]}`, (msg) => {
      if (msg[0] !== 'EVENT' || (matchFilters(filters, msg[2]) && verifyEvent(msg[2]))) {
        machina.push(msg);
      }
    });

    opts?.signal?.addEventListener('abort', () => {
      this.#ee.removeAllListeners(`req:${uuid}`);
      this.msg(['CLOSE', uuid]);
    });

    return machina.stream(opts?.signal);
  }

  event(event: NostrEvent, { signal }: NStoreOpts = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));

      if (signal?.aborted) {
        onAbort();
      }

      this.#ee.once(`event:${event.id}`, ([_verb, _eventId, ok, reason]) => {
        signal?.removeEventListener('abort', onAbort);
        this.#ee.removeAllListeners(`event:${event.id}`);

        if (ok) {
          resolve();
        } else {
          reject(new Error(reason));
        }
      });

      signal?.addEventListener('abort', onAbort, { once: true });

      this.msg(['EVENT', event]);
    });
  }

  async query(filters: NostrFilter[], opts?: NStoreOpts): Promise<NostrEvent[]> {
    const events: NostrEvent[] = [];
    const controller = new AbortController();

    const onAbort = () => controller.abort();
    opts?.signal?.addEventListener('abort', onAbort, { once: true });

    for await (const msg of this.req(filters, { ...opts, signal: controller.signal })) {
      if (msg[0] === 'EVENT') {
        events.push(msg[2]);
      } else {
        controller.abort();
        opts?.signal?.removeEventListener('abort', onAbort);
        break;
      }
    }

    return events;
  }

  count(filters: NostrFilter[], opts?: NReqOpts): Promise<NostrRelayCOUNT[2]> {
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));

      if (opts?.signal?.aborted) {
        onAbort();
      }

      const uuid = opts?.subscriptionId ?? crypto.randomUUID();
      const count: NostrClientCOUNT = ['COUNT', uuid, ...filters];

      this.#ee.once(`count:${count[1]}`, ([_verb, _subscriptionId, result]) => {
        opts?.signal?.removeEventListener('abort', onAbort);
        resolve(result);
      });

      opts?.signal?.addEventListener('abort', onAbort, { once: true });

      this.msg(count);
    });
  }
}
