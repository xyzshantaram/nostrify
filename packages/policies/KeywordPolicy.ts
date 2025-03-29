import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from 'zod';

/** Policy options for `KeywordPolicy`. */
export const KeywordPolicyOptsSchema = z.object({
  /** List of banned keywords (case-insensitive). */
  keywords: z.array(z.string())
    .describe('Banned keywords (case-insensitive)'),
});

/** Policy options for `KeywordPolicy`. */
export interface KeywordPolicyOpts extends z.TypeOf<typeof KeywordPolicyOptsSchema> {}

/**
 * Reject events containing any of the strings in its content.
 *
 * @example
 * ```ts
 * // Reject events with bad words.
 * new KeywordPolicy({ keywords: ['moo', 'oink', 'honk'] });
 * ```
 */
export class KeywordPolicy implements NPolicy {
  constructor(private opts: KeywordPolicyOpts) {}

  // deno-lint-ignore require-await
  async call({ id, content }: NostrEvent): Promise<NostrRelayOK> {
    for (const word of this.opts.keywords) {
      if (content.toLowerCase().includes(word.toLowerCase())) {
        return ['OK', id, false, 'blocked: contains a banned word or phrase'];
      }
    }

    return ['OK', id, true, ''];
  }
}
