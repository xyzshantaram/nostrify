import { type DeleteResult, Kysely, type SelectQueryBuilder, sql } from 'kysely';
import { sortEvents } from 'nostr-tools';

import { NostrEvent } from '../interfaces/NostrEvent.ts';
import { NStore } from '../interfaces/NStore.ts';
import { NostrFilter } from '../interfaces/NostrFilter.ts';

import { NKinds } from './NKinds.ts';

/** Kysely database schema for Nostr. */
export interface NDatabaseSchema {
  nostr_events: {
    id: string;
    kind: number;
    pubkey: string;
    content: string;
    created_at: number;
    tags: string;
    sig: string;
  };
  nostr_tags: {
    event_id: string;
    name: string;
    value: string;
  };
  nostr_fts5: {
    event_id: string;
    content: string;
  };
}

export interface NDatabaseOpts {
  /** Whether or not to enable full-text search with SQLite FTS5. */
  fts5?: boolean;
  /**
   * Function that returns which tags to index so tag queries like `{ "#p": ["123"] }` will work.
   * By default, all single-letter tags are indexed.
   */
  indexTags?(event: NostrEvent): string[][];
  /**
   * Build a search index from the event.
   * By default, only kinds 0 and 1 events are indexed for search, and the search text is the event content with tag values appended to it.
   * Only applicable if `fts5` is `true`.
   */
  searchText?(event: NostrEvent): string | undefined;
}

interface TagsDiffItem {
  type: 'replacements' | 'updates' | 'deletions' | 'additions';
  tag: string;
  value: string[];
}

type DiffResult = Partial<Record<TagsDiffItem['type'], TagsDiffItem[]>>;

/**
 * SQLite database storage adapter for Nostr events.
 * It uses [Kysely](https://kysely.dev/) to make queries, making it flexible for a variety of use-cases.
 *
 * ```ts
 * // Create a Kysely instance.
 * const kysely = new Kysely({
 *   dialect: new DenoSqliteDialect({
 *     database: new Sqlite('./db.sqlite3'),
 *   }),
 * });
 *
 * // Pass Kysely into the constructor.
 * const db = new NDatabase(kysely);
 *
 * // Migrate the database before use.
 * await db.migrate();
 *
 * // Now it's just a regular storage.
 * await db.event(event1);
 * await db.event(event2);
 * const events = await db.query([{ kinds: [1] }]);
 * ```
 */
export class NDatabase implements NStore {
  private db: Kysely<NDatabaseSchema>;
  private fts5: boolean;
  private indexTags: (event: NostrEvent) => string[][];
  private searchText: (event: NostrEvent) => string | undefined;

  constructor(db: Kysely<any>, opts?: NDatabaseOpts) {
    this.db = db as Kysely<NDatabaseSchema>;
    this.fts5 = opts?.fts5 ?? false;
    this.indexTags = opts?.indexTags ?? NDatabase.indexTags;
    this.searchText = opts?.searchText ?? NDatabase.searchText;
  }

  /** Default tag index function. */
  static indexTags(event: NostrEvent): string[][] {
    return event.tags.filter(([name, value]) => name.length === 1 && value && value.length < 200);
  }

  /** Default search content builder. */
  static searchText(event: NostrEvent): string | undefined {
    if (event.kind === 0 || event.kind === 1) {
      return `${event.content} ${event.tags.map(([_name, value]) => value).join(' ')}`.substring(0, 1000);
    }
  }

  /** Insert an event (and its tags) into the database. */
  async event(event: NostrEvent): Promise<void> {
    if (NKinds.ephemeral(event.kind)) return;

    if (await this.isDeleted(event)) {
      throw new Error('Cannot add a deleted event!');
    }
    return await this.db.transaction().execute(async (trx) => {
      await this.deleteEvents(trx, event);
      if (NKinds.replaceable(event.kind) || NKinds.parameterizedReplaceable(event.kind)) {
        const diffs = await this.calculateEventTagDiff(trx, event);
        // insert the event _after_ calculating the diff - otherwise we will diff the
        // event against itself.
        await this.insertEvent(trx, event);

        // process the diff. Inserts and deletes are grouped together;
        // updates are done piecemeal (for now).
        this.executeDiff(trx, event, diffs);
      } else {
        // otherwise, straightaway insert the event and its tags.
        await this.insertEvent(trx, event);
        await this.insertTags(trx, event);
      }
      // search indexing is common to all evt types.
      await this.indexSearch(trx, event);
    }).catch((error) => {
      // Don't throw for duplicate events.
      if (error.message.includes('UNIQUE constraint failed')) return;
      else throw error;
    });
  }

  /** Check if an event has deleted previously with a kind 5. */
  protected async isDeleted(event: NostrEvent): Promise<boolean> {
    const [deletion] = await this.query([
      { kinds: [5], authors: [event.pubkey], '#e': [event.id], limit: 1 },
    ]);
    return !!deletion;
  }

  /** Delete events referenced by kind 5. */
  protected async deleteEvents(trx: Kysely<NDatabaseSchema>, event: NostrEvent): Promise<void> {
    if (event.kind === 5) {
      await this.deleteEventsTrx(trx, [{
        ids: event.tags.filter(([name]) => name === 'e')?.[1],
        authors: [event.pubkey],
      }]);
    }
  }

  protected async executeDiff(
    trx: Kysely<NDatabaseSchema>,
    event: NostrEvent,
    diffs: Awaited<ReturnType<NDatabase['calculateEventTagDiff']>>,
  ) {
    for (const diff of diffs) {
      if (diff.additions?.length) {
        await trx.insertInto('nostr_tags').values(diff.additions.map((v) => ({
          event_id: event.id,
          name: v.tag,
          value: v.value[0],
        }))).execute();
      }

      if (diff.deletions?.length) {
        await trx.deleteFrom('nostr_tags')
          .where('event_id', '=', diff.oldId)
          .where((eb) => eb.or(diff.deletions!.map((deletion) => eb('name', '=', deletion.tag))))
          .execute();
      }

      for (const itm of [diff.replacements || undefined, diff.updates || undefined].flat()) {
        if (!itm) continue;
        const val: Record<string, any> = { event_id: event.id };
        if (itm.type === 'replacements') val.value = itm.value;
        await trx.updateTable('nostr_tags')
          .set(val)
          .where('event_id', '=', diff.oldId)
          .where('name', '=', itm.tag)
          .execute();
      }
    }
  }

  /**
   * Compute the list of changes to be made to the database to replace one
   * version of an event with another version of an event.
   * @param trx The transaction to use.
   * @param event The event to compute the diff for.
   * @returns The list of change operations to perform, along with the new and old event ids.
   */
  protected async calculateEventTagDiff(trx: Kysely<NDatabaseSchema>, event: NostrEvent) {
    if (!NKinds.replaceable(event.kind) && !NKinds.parameterizedReplaceable(event.kind)) {
      throw new Error('Non-replaceable event passed to NDatabase::diffEvents');
    }

    // Find the d tag associated with this event. If this is a parameterized replaceable
    // event and no d tag is supplied, the event is invalid and we return.
    const d = event.tags.find(([tag]) => tag === 'd')?.[1];
    if (NKinds.parameterizedReplaceable(event.kind) && !d) return [];

    const filter: NostrFilter = {
      kinds: [event.kind],
      authors: [event.pubkey],
      '#d': d && NKinds.parameterizedReplaceable(event.kind) ? [d] : undefined,
    };

    // Now, delete all events older than the given event.
    await this.deleteReplaced(
      trx,
      event,
      filter,
      (event, prevEvent) => event.created_at > prevEvent.created_at,
      'Cannot replace an event with an older event',
    );

    const prevEvents = await this.getFilterQuery(trx, filter).execute();

    type E = Pick<NostrEvent, 'created_at'>;
    const replaces = (event: E, prevEvent: E) => event.created_at > prevEvent.created_at;

    const diffs: ({ oldId: string; newId: string } & DiffResult)[] = [];

    if (!prevEvents.length) {
      // If no previous events exist, the diff is going to be empty, even though
      // we have to process N additions. So we blindly add the tags.
      diffs.push({ ...NDatabase.getTagChangeList([], event.tags), oldId: '', newId: event.id });
    } else {
      // For each previous event, diff the tags and add them to the changeset.
      for (const prevEvent of prevEvents) {
        if (!replaces(event, prevEvent)) throw new Error('Cannot replace an event with an older event');
        const oldTags: string[][] = JSON.parse(prevEvent.tags);
        const diff = NDatabase.getTagChangeList(oldTags, event.tags);
        diffs.push({ ...diff, oldId: prevEvent.id, newId: event.id });
      }
    }

    return diffs;
  }

  /**
   * Compute the differences in tags between two versions of an event.
   * This event blindly compares two string arrays - the actual list of changes is computed
   *
   * @param oldTags The tags array of the replaced event.
   * @param newTags The tags array of the replacing event.
   * @returns the result of diffing the two sets of tags as a Record of change types --> change lists.
   */
  private static getTagChangeList(oldTags: string[][], newTags: string[][]): DiffResult {
    const equal = (arr1: any[], arr2: any[]) => arr1.every((itm, i) => itm === arr2[i]);
    // Map from tag names to tag value.
    const oldMap = Object.fromEntries(oldTags.map((tagSet) => [tagSet[0], tagSet.slice(1)]));

    const addressed = new Set<string>();
    const res: TagsDiffItem[] = [];

    for (const [tag, ...value] of newTags) {
      // This loop calculates updates (id changed) / replacements (id and value changed) /
      // additions (new tag added).
      // we _could_ do deletions here as well but that would be a nested loop going over all tags.
      // instead, we use the `addressed` set to keep track of what tags have already been handled
      // and don't touch those ones in the second loop.
      addressed.add(tag);
      res.push({
        tag,
        value,
        // if the old map has a tag of the same name and the values are equal,
        // we simply need to **update** the id.
        // if the old map has the tag but the values aren't equal, we **replace** the tag.
        // if the old map does not contain the tag, we simply add it to the new event.
        type: oldMap[tag] ? (equal(oldMap[tag], value) ? 'updates' : 'replacements') : 'additions',
      });
    }

    // Handle deletions by figuring out what tags exist in the old set but not the new one.
    for (const [tag, ...value] of oldTags) {
      if (addressed.has(tag)) continue;
      res.push({ type: 'deletions', tag, value });
    }

    // finally, group the result by type so we can do grouped inserts/deletes.
    return Object.groupBy(res, (v) => v.type);
  }

  /** Insert the event into the database. */
  protected async insertEvent(trx: Kysely<NDatabaseSchema>, event: NostrEvent): Promise<void> {
    await trx.insertInto('nostr_events')
      .values({ ...event, tags: JSON.stringify(event.tags) })
      .execute();
  }

  /** Insert event tags depending on the event and settings. */
  protected async insertTags(trx: Kysely<NDatabaseSchema>, event: NostrEvent): Promise<void> {
    const tags = this.indexTags(event);
    const rows = tags.map(([name, value]) => ({ event_id: event.id, name, value }));

    if (!tags.length) return;
    await trx.insertInto('nostr_tags')
      .values(rows)
      .execute();
  }

  /** Add search data to the FTS5 table. */
  protected async indexSearch(trx: Kysely<NDatabaseSchema>, event: NostrEvent): Promise<void> {
    if (!this.fts5) return;
    const content = this.searchText(event);
    if (!content) return;
    await trx.insertInto('nostr_fts5')
      .values({ event_id: event.id, content })
      .execute();
  }

  /** Delete events that are replaced by the new event. */
  protected async deleteReplaced(
    trx: Kysely<NDatabaseSchema>,
    event: NostrEvent,
    filter: NostrFilter,
    replaces: (event: NostrEvent, prevEvent: NDatabaseSchema['nostr_events']) => boolean,
    error: string,
  ): Promise<void> {
    const prevEvents = await this.getFilterQuery(trx, filter).execute();
    for (const prevEvent of prevEvents) {
      if (!replaces(event, prevEvent)) {
        throw new Error(error);
      }
    }
    await this.deleteEventsTrx(trx, [filter]);
  }

  /** Build the query for a filter. */
  protected getFilterQuery(
    db: Kysely<NDatabaseSchema>,
    filter: NostrFilter,
  ): SelectQueryBuilder<NDatabaseSchema, 'nostr_events', NDatabaseSchema['nostr_events']> {
    let query = db
      .selectFrom('nostr_events')
      .selectAll();

    /** Whether we are querying for replaceable events by author. */
    const isAddrQuery = filter.authors &&
      filter.kinds &&
      filter.kinds.every((kind) => NKinds.replaceable(kind) || NKinds.parameterizedReplaceable(kind));

    // Avoid ORDER BY when querying for replaceable events by author.
    if (!isAddrQuery) {
      query = query.orderBy('created_at', 'desc');
    }

    if (filter.ids) {
      query = query.where('id', 'in', filter.ids);
    }
    if (filter.kinds) {
      query = query.where('kind', 'in', filter.kinds);
    }
    if (filter.authors) {
      query = query.where('pubkey', 'in', filter.authors);
    }
    if (typeof filter.since === 'number') {
      query = query.where('created_at', '>=', filter.since);
    }
    if (typeof filter.until === 'number') {
      query = query.where('created_at', '<=', filter.until);
    }
    if (typeof filter.limit === 'number') {
      query = query.limit(filter.limit);
    }

    if (filter.search) {
      if (this.fts5) {
        query = query
          .innerJoin('nostr_fts5', 'nostr_fts5.event_id', 'nostr_events.id')
          .where('nostr_fts5.content', 'match', JSON.stringify(filter.search));
      } else {
        return db.selectFrom('nostr_events').selectAll().where('id', 'in', []);
      }
    }

    const joinedQuery = query.leftJoin('nostr_tags', 'nostr_tags.event_id', 'nostr_events.id');

    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('#') && Array.isArray(value)) {
        const name = key.replace(/^#/, '');
        query = joinedQuery
          .where('nostr_tags.name', '=', name)
          .where('nostr_tags.value', 'in', value);
      }
    }

    return query;
  }

  /** Combine filter queries into a single union query. */
  protected getEventsQuery(
    filters: NostrFilter[],
  ): SelectQueryBuilder<NDatabaseSchema, 'nostr_events', NDatabaseSchema['nostr_events']> {
    return filters
      .map((filter) =>
        this.db
          .selectFrom(() => this.getFilterQuery(this.db, filter).as('nostr_events'))
          .selectAll()
      )
      .reduce((result, query) => result.unionAll(query));
  }

  /** Get events for filters from the database. */
  async query(filters: NostrFilter[], opts: { signal?: AbortSignal; limit?: number } = {}): Promise<NostrEvent[]> {
    let query = this.getEventsQuery(filters);

    if (typeof opts.limit === 'number') {
      query = query.limit(opts.limit);
    }

    const events = (await query.execute()).map((row) => {
      return {
        id: row.id,
        kind: row.kind,
        pubkey: row.pubkey,
        content: row.content,
        created_at: row.created_at,
        tags: JSON.parse(row.tags),
        sig: row.sig,
      };
    });

    return sortEvents(events);
  }

  /** Delete events from each table. Should be run in a transaction! */
  protected async deleteEventsTrx(db: Kysely<NDatabaseSchema>, filters: NostrFilter[]): Promise<DeleteResult[]> {
    const query = this.getEventsQuery(filters).clearSelect().select('id');
    if (this.fts5) {
      await db.deleteFrom('nostr_fts5')
        .where('event_id', 'in', () => query)
        .execute();
    }

    return db.deleteFrom('nostr_events')
      .where('id', 'in', () => query)
      .execute();
  }

  /** Delete events based on filters from the database. */
  async remove(filters: NostrFilter[]): Promise<void> {
    await this.db.transaction().execute((trx) => this.deleteEventsTrx(trx, filters));
  }

  /** Get number of events that would be returned by filters. */
  async count(filters: NostrFilter[]): Promise<{ count: number; approximate: false }> {
    const query = this.getEventsQuery(filters);

    const [{ count }] = await query
      .clearSelect()
      .select((eb) => eb.fn.count('id').as('count'))
      .execute();

    return {
      count: Number(count),
      approximate: false,
    };
  }

  /** Migrate the database schema. */
  async migrate(): Promise<void> {
    const schema = this.db.schema;

    await schema
      .createTable('nostr_events')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('kind', 'integer', (col) => col.notNull())
      .addColumn('pubkey', 'text', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('created_at', 'integer', (col) => col.notNull())
      .addColumn('tags', 'text', (col) => col.notNull())
      .addColumn('sig', 'text', (col) => col.notNull())
      .execute();

    await schema
      .createTable('nostr_tags')
      .ifNotExists()
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('value', 'text', (col) => col.notNull())
      .addColumn('event_id', 'text', (col) => col.references('nostr_events.id').onDelete('cascade'))
      .execute();

    await schema.createIndex('nostr_events_kind').on('nostr_events').ifNotExists().column('kind').execute();
    await schema.createIndex('nostr_events_pubkey').on('nostr_events').ifNotExists().column('pubkey').execute();
    await schema
      .createIndex('nostr_events_kind_pubkey_created_at')
      .on('nostr_events')
      .ifNotExists()
      .columns(['kind', 'pubkey', 'created_at desc'])
      .execute();

    await schema.createIndex('nostr_tags_event_id').on('nostr_tags').ifNotExists().column('event_id').execute();
    await schema
      .createIndex('nostr_tags_tag_value')
      .on('nostr_tags')
      .ifNotExists()
      .columns(['name', 'value'])
      .execute();

    if (this.fts5) {
      await sql`CREATE VIRTUAL TABLE nostr_fts5 USING fts5(event_id, content)`.execute(this.db);
    }
  }
}
