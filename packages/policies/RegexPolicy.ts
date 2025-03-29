import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from "zod";

/** Policy options for `RegexPolicy`. */
export const RegexPolicyOptsSchema = z.object({
  /** Regular expression to test event content against. */
  expr: z.string().describe("Expression"),
  flags: z.string().optional().describe("Additional RegExp flags. Leave blank if unsure.")
});

/** Policy options for `RegexPolicy`. */
export interface RegexPolicyOpts extends Partial<z.TypeOf<typeof RegexPolicyOptsSchema>> {
  expr: string;
}

/**
 * Reject events whose content matches the regex.
 *
 * ```ts
 * // Ban events matching a regex.
 * new RegexPolicy({ regex: /(🟠|🔥|😳)ChtaGPT/i });
 * ```
 */
export class RegexPolicy implements NPolicy {
  constructor(private opts: RegexPolicyOpts, private regex = new RegExp(opts.expr, opts.flags)) { }

  // deno-lint-ignore require-await
  async call({ id, content }: NostrEvent): Promise<NostrRelayOK> {
    if (this.regex.test(content)) {
      return ['OK', id, false, 'blocked: text matches a banned expression'];
    }

    return ['OK', id, true, ''];
  }
}