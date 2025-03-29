import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from "zod";

/** Policy options for `PubkeyBanPolicy`. */
export const PubkeyBanPolicyOptsSchema = z.object({
  /** List of banned pubkeys. */
  pubkeys: z.array(z.string())
    .describe("List of banned pubkeys."),
});

/** Policy options for `PubkeyBanPolicy`. */
export interface PubkeyBanPolicyOpts extends z.TypeOf<typeof PubkeyBanPolicyOptsSchema> {}

/**
 * Ban events from individual pubkeys.
 *
 * ```ts
 * // Ban a specific pubkey.
 * new PubkeyBanPolicy({ pubkeys: ['e810fafa1e89cdf80cced8e013938e87e21b699b24c8570537be92aec4b12c18'] });
 * ```
 */
export class PubkeyBanPolicy implements NPolicy {
  constructor(private opts: PubkeyBanPolicyOpts) {}

  // deno-lint-ignore require-await
  async call({ id, pubkey }: NostrEvent): Promise<NostrRelayOK> {
    for (const p of this.opts.pubkeys) {
      if (p === pubkey) {
        return ['OK', id, false, 'blocked: pubkey is banned'];
      }
    }

    return ['OK', id, true, ''];
  }
}