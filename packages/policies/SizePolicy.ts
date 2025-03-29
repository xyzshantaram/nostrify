import { NostrEvent, NostrRelayOK, NPolicy } from '@nostrify/types';
import { z } from "zod";

/** Policy options for `SizePolicy`. */
export const SizePolicyOptsSchema = z.object({
  /** Maximum size of the message content in bytes. Default: `8192` (8KB). */
  maxBytes: z.number()
    .default(8 * 1024)
    .describe("Max allowed message size in bytes (default: 8192)"),
});

/** Policy options for `SizePolicy`. */
export interface SizePolicyOpts extends Partial<z.TypeOf<typeof SizePolicyOptsSchema>> { }

/**
 * Reject events larger than a specified size in bytes.
 *
 * ```ts
 * // Reject events larger than the default size (8KB) .
 * new SizePolicy();
 * // Reject events larger than a custom size (15KB).
 * new SizePolicy({ maxBytes: 15 * 1024 });
 * ```
 */
export class SizePolicy implements NPolicy {
  constructor(private opts: SizePolicyOpts = {}) { }

  // deno-lint-ignore require-await
  async call(event: NostrEvent): Promise<NostrRelayOK> {
    const { maxBytes = 8 * 1024 } = this.opts;

    const json = JSON.stringify(event);
    const size = new TextEncoder().encode(json).length;

    if (size > maxBytes) {
      return ['OK', event.id, false, `blocked: event is too large`];
    }

    return ['OK', event.id, true, ''];
  }
}