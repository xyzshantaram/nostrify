import { matchFilters } from 'nostr-tools';
import { NSchema as n } from '../nostrify/NSchema.ts';
import { z } from 'zod';
import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';

export const FiltersPolicyOptsSchema = z.object({
  /* A list of [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) relay filters. */
  filters: z.array(n.filter())
});

interface FiltersPolicyOpts extends z.TypeOf<typeof FiltersPolicyOptsSchema> { }

/**
 * Reject events which don't match the filters.
 *
 * Only messages which **match** the filters are allowed, and all others are dropped.
 * 
 * ```ts
 * // Only allow kind 1, 3, 5, and 7 events.
 * new FiltersPolicy({ filters: [{ kinds: [0, 1, 3, 5, 6, 7] }] });
 * ```
 */
export class FiltersPolicy implements NPolicy {
  constructor(private opts: FiltersPolicyOpts) { }

  // deno-lint-ignore require-await
  async call(event: NostrEvent): Promise<NostrRelayOK> {
    if (matchFilters(this.opts.filters, event)) {
      return ['OK', event.id, true, ''];
    }

    return ['OK', event.id, false, "blocked: the event doesn't match the allowed filters"];
  }
}
