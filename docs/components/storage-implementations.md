# Storage Implementations

## Overview

Nostrify provides several storage implementations to meet different needs:

1. NCache: In-memory caching
2. NDatabase: SQL-based storage
3. NPostgres: PostgreSQL optimization
4. NDenoKv: Deno KV storage

## NCache Implementation

### Basic Usage
```typescript
const cache = new NCache({ max: 1000 });

// Add events
await cache.add(event1);
await cache.add(event2);

// Query events
const events = await cache.query([{ kinds: [1] }]);
```

### Configuration Options
```typescript
interface NCacheOptions {
  max?: number;           // Maximum number of events to store
  ttl?: number;          // Time-to-live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
}
```

### Example with TTL
```typescript
const cache = new NCache({
  max: 1000,
  ttl: 3600000, // 1 hour
  cleanupInterval: 300000 // 5 minutes
});
```

## NDatabase Implementation

### Setup
```typescript
import { NDatabase } from '@nostrify/db';

const db = new NDatabase({
  client: 'sqlite3',
  connection: {
    filename: './nostr.db'
  }
});

// Initialize tables
await db.init();
```

### Basic Operations
```typescript
// Store event
await db.add(event);

// Query events
const events = await db.query([
  { kinds: [1], limit: 100 }
]);

// Count events
const count = await db.count([
  { kinds: [1] }
]);

// Remove events
await db.remove([
  { kinds: [1], authors: ['pubkey'] }
]);
```

## NPostgres Implementation

### Setup
```typescript
import { NPostgres } from '@nostrify/db';

const db = new NPostgres({
  connection: {
    host: 'localhost',
    database: 'nostr',
    user: 'user',
    password: 'password'
  }
});

await db.init();
```

### Optimized Queries
```typescript
// Using built-in optimizations
const events = await db.query([
  { 
    kinds: [1],
    authors: ['pubkey'],
    '#t': ['tag'],
    since: timestamp,
    until: timestamp,
    limit: 100
  }
]);
```

### Batch Operations
```typescript
// Batch insert
await db.addMany(events);

// Batch delete
await db.removeMany(eventIds);
```

## NDenoKv Implementation

### Setup
```typescript
import { NDenoKv } from '@nostrify/denokv';

const kv = await Deno.openKv();
const store = new NDenoKv(kv);
```

### Basic Operations
```typescript
// Store event
await store.add(event);

// Query events
const events = await store.query([
  { kinds: [1], limit: 100 }
]);
```

## Combining Storage Implementations

### Caching Layer
```typescript
class CachedDatabase {
  constructor(
    private db: NDatabase,
    private cache: NCache
  ) {}

  async event(id: string) {
    // Check cache first
    const cached = await this.cache.event(id);
    if (cached) return cached;

    // Fallback to database
    const event = await this.db.event(id);
    if (event) {
      await this.cache.add(event);
    }
    return event;
  }

  async query(filters: NostrFilter[]) {
    // Try cache for simple queries
    if (this.isSimpleQuery(filters)) {
      const cached = await this.cache.query(filters);
      if (cached.length > 0) return cached;
    }

    // Fallback to database
    const events = await this.db.query(filters);
    
    // Update cache
    await Promise.all(events.map(e => this.cache.add(e)));
    
    return events;
  }

  private isSimpleQuery(filters: NostrFilter[]) {
    return filters.length === 1 && 
           filters[0].kinds?.length === 1 &&
           !filters[0].since &&
           !filters[0].until;
  }
}
```

### Write-Through Cache
```typescript
class WriteThroughCache {
  constructor(
    private primary: NDatabase,
    private secondary: NCache
  ) {}

  async add(event: NostrEvent) {
    // Write to both storages
    await Promise.all([
      this.primary.add(event),
      this.secondary.add(event)
    ]);
  }

  async remove(filters: NostrFilter[]) {
    // Remove from both storages
    await Promise.all([
      this.primary.remove(filters),
      this.secondary.remove(filters)
    ]);
  }
}
```

## Performance Considerations

### Indexing Strategies
```typescript
// For PostgreSQL
await db.raw(`
  CREATE INDEX idx_events_kind ON events (kind);
  CREATE INDEX idx_events_pubkey ON events (pubkey);
  CREATE INDEX idx_events_created_at ON events (created_at);
  CREATE INDEX idx_event_tags ON event_tags (name, value);
`);
```

### Query Optimization
```typescript
class OptimizedStore extends NDatabase {
  async query(filters: NostrFilter[]) {
    // Sort filters by estimated selectivity
    const optimizedFilters = this.sortFiltersBySelectivity(filters);
    
    // Apply most selective filter first
    let events = await super.query([optimizedFilters[0]]);
    
    // Apply remaining filters in memory
    for (const filter of optimizedFilters.slice(1)) {
      events = events.filter(e => this.matchesFilter(e, filter));
    }
    
    return events;
  }
}
```