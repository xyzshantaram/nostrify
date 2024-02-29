import { NostrEvent } from '../interfaces/NostrEvent.ts';

/** Function to decide whether or not to index a tag. */
export type NTagIndex = ({ event, count, value }: { event: NostrEvent; count: number; value: string }) => boolean;

export function NTagIndexer(tagIndexes: Record<string, NTagIndex>): (event: NostrEvent) => string[][] {
  return (event: NostrEvent): string[][] => {
    const tagCounts: Record<string, number> = {};

    function getCount(name: string): number {
      return tagCounts[name] || 0;
    }

    function incrementCount(name: string): void {
      tagCounts[name] = getCount(name) + 1;
    }

    function shouldIndex(name: string, value: string, index: NTagIndex): boolean {
      return index({
        event,
        count: getCount(name),
        value,
      });
    }

    return event.tags.reduce<string[][]>((results, tag) => {
      const [name, value] = tag;
      const index = tagIndexes[name] as NTagIndex | undefined;

      if (value && index && value.length < 200 && shouldIndex(name, value, index)) {
        results.push(tag);
      }

      incrementCount(name);
      return results;
    }, []);
  };
}
