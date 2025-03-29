import { NostrEvent, NostrRelayOK, NPolicy, NStore } from '@nostrify/types';
import { z } from 'zod';

/** Options for the `WoTPolicy`. */
export const WoTPolicyOptsSchema = z.object({
  /** Initial set of trusted pubkeys to query follow lists for. */
  pubkeys: z.array(z.string()),
  /**
   * How many levels of follow lists to query.
   * `0` will just whitelist the given `pubkeys` without checking their follow lists.
   * `1` will query their follows,
   * `2` will query their follows follows, etc.
   */
  depth: z.number().default(2),
});

/** Policy options for `WoTPolicy`. */
export interface WoTPolicyOpts extends z.TypeOf<typeof WoTPolicyOptsSchema> {
  /** Store to get kind 3 follow lists from. */
  store: NStore;
}

/** Whitelist pubkeys the given user follows, people those users follow, etc. up to `depth`. */
export class WoTPolicy implements NPolicy {
  private pubkeys: Promise<Set<string>> | undefined;

  constructor(private opts: WoTPolicyOpts) {}

  async call(event: NostrEvent): Promise<NostrRelayOK> {
    this.pubkeys ??= this.getPubkeys();
    const pubkeys = await this.pubkeys;

    if (pubkeys.has(event.pubkey)) {
      return ['OK', event.id, true, ''];
    }

    return ['OK', event.id, false, 'blocked: only certain pubkeys are allowed to post'];
  }

  /** Retrieve the complete set of pubkeys to whitelist. */
  private async getPubkeys(): Promise<Set<string>> {
    const { store, depth } = this.opts;

    const pubkeys = new Set<string>([...this.opts.pubkeys]);
    const authors = new Set(pubkeys);

    for (let i = 0; i < depth; i++) {
      const events = await store.query([{ kinds: [3], authors: [...authors] }]);

      authors.clear();

      for (const event of events) {
        for (const [name, value] of event.tags) {
          if (name === 'p') {
            if (!pubkeys.has(value)) { // Avoid infinite loops.
              authors.add(value);
            }
            pubkeys.add(value);
          }
        }
      }
    }

    return pubkeys;
  }
}
