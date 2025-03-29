import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from "zod";

/** Policy options for `HashtagPolicy`. */
export const HashtagPolicyOptsSchema = z.object({
  /** List of banned hashtags (case-insensitive). */
  hashtags: z.array(z.string())
    .describe("List of banned hashtags (case-insensitive)."),
});

/** Policy options for `HashtagPolicy`. */
export interface HashtagPolicyOpts extends z.TypeOf<typeof HashtagPolicyOptsSchema> {}

/**
 * Reject events containing any of the banned hashtags.
 *
 * @example
 * ```ts
 * // Reject events with banned hashtags.
 * new HashtagPolicy({ hashtags: ['nsfw'] });
 * ```
 */
export class HashtagPolicy implements NPolicy {
  constructor(private opts: HashtagPolicyOpts) {}

  // deno-lint-ignore require-await
  async call({ id, tags }: NostrEvent): Promise<NostrRelayOK> {
    for (const [name, value] of tags) {
      if (name === 't' && this.opts.hashtags.includes(value.toLowerCase())) {
        return ['OK', id, false, 'blocked: contains a banned hashtag'];
      }
    }

    return ['OK', id, true, ''];
  }
}