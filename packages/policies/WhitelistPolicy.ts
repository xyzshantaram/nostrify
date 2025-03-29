import { NostrEvent, NostrRelayInfo, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from 'zod';

/** Policy options for `WhitelistPolicy`. */
export const WhitelistPolicyOptsSchema = z.object({
  /** List of allowed pubkeys. */
  pubkeys: z.array(z.string())
    .describe('Allowed pubkeys'),
});

/** Policy options for `WhitelistPolicy`. */
export interface WhitelistPolicyOpts extends z.TypeOf<typeof WhitelistPolicyOptsSchema> {}

/**
 * Allows only the listed pubkeys to post. All other events are rejected.
 *
 * ```ts
 * // Only the given pubkey may post.
 * new WhitelistPolicy({ pubkeys: ['e810fafa1e89cdf80cced8e013938e87e21b699b24c8570537be92aec4b12c18'] });
 * ```
 */
export class WhitelistPolicy implements NPolicy {
  constructor(private opts: WhitelistPolicyOpts) {}

  // deno-lint-ignore require-await
  async call({ id, pubkey }: NostrEvent): Promise<NostrRelayOK> {
    for (const p of this.opts.pubkeys) {
      if (p === pubkey) {
        return ['OK', id, true, ''];
      }
    }

    return ['OK', id, false, 'blocked: only certain pubkeys are allowed to post'];
  }

  get info(): NostrRelayInfo {
    return {
      limitation: {
        restricted_writes: true,
      },
    };
  }
}
