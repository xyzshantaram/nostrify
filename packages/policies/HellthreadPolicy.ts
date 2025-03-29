import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from "zod";

/** Policy options for `HellthreadPolicy`. */
export const HellthreadPolicyOptsSchema = z.object({
  /** Total number of "p" tags a kind 1 note may have before it's rejected. Default: `100`. */
  limit: z.number()
    .default(100)
    .describe("Maximum number of mentions to allow per post"),
});

/** Policy options for `HellthreadPolicy`. */
export interface HellthreadPolicyOpts extends Partial<z.TypeOf<typeof HellthreadPolicyOptsSchema>> { }

/** Basic policy to demonstrate how policies work. Accepts all events. */
export class HellthreadPolicy implements NPolicy {
  constructor(private opts: HellthreadPolicyOpts = {}) { }

  // deno-lint-ignore require-await
  async call({ id, kind, tags }: NostrEvent): Promise<NostrRelayOK> {
    const { limit = 100 } = this.opts;

    if (kind === 1) {
      const p = tags.filter((tag) => tag[0] === 'p');

      if (p.length > limit) {
        return ['OK', id, false, `blocked: rejected due to ${p.length} \"p\" tags (${limit} is the limit).`];
      }
    }

    return ['OK', id, true, ''];
  }
}