import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from "zod";

/** Policy options for `RegexPolicy`. */
export const RegexPolicyOptsSchema = z.object({
  /** Regular expression to test event content against. */
  regex: z.instanceof(RegExp)
    .describe("Regular expression to test event content against."),
});

/** Policy options for `RegexPolicy`. */
export interface RegexPolicyOpts extends z.TypeOf<typeof RegexPolicyOptsSchema> {}

/**
 * Reject events whose content matches the regex.
 *
 * ```ts
 * // Ban events matching a regex.
 * new RegexPolicy({ regex: /(🟠|🔥|😳)ChtaGPT/i });
 * ```
 */
export class RegexPolicy implements NPolicy {
  constructor(private opts: RegexPolicyOpts) {}

  // deno-lint-ignore require-await
  async call({ id, content }: NostrEvent): Promise<NostrRelayOK> {
    if (this.opts.regex.test(content)) {
      return ['OK', id, false, 'blocked: text matches a banned expression'];
    }

    return ['OK', id, true, ''];
  }
}