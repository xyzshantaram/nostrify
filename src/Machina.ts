/**
 * Infinite async generator. Iterates messages pushed to it until closed.
 * Only one consumer is expected to use a Machina instance at a time.
 *
 * @example
 * ```ts
 * // Create the Machina instance
 * const machina = new Machina<string>();
 *
 * // Async generator loop
 * async function getMessages() {
 *   for await (const msg of machina.stream()) {
 *     console.log(msg);
 *   }
 * }
 *
 * // Start the generator
 * getMessages();
 *
 * // Push messages to it
 * machina.push('hello!');
 * machina.push('whats up?');
 * machina.push('greetings');
 * ```
 */
export class Machina<T> {
  #open = true;
  #queue: T[] = [];
  #resolve: (() => void) | undefined;

  /** Get messages as an AsyncGenerator. */
  async *stream(signal?: AbortSignal): AsyncGenerator<T> {
    this.#open = true;

    signal?.addEventListener('abort', () => {
      this.#open = false;
      this.#resolve?.();
    }, { once: true });

    while (this.#open) {
      if (this.#queue.length) {
        yield this.#queue.shift()!;
        continue;
      }

      await new Promise<void>((_resolve) => {
        this.#resolve = _resolve;
      });
    }
  }

  /** Push a message into the Machina instance, making it available to the consumer of `stream()`. */
  push(data: T): void {
    this.#queue.push(data);
    this.#resolve?.();
  }
}
