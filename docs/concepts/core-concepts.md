# Core Concepts

## Nostr Protocol Basics

### Events
Events are the fundamental unit of data in Nostr. They contain:
- Content
- Public key (author)
- Kind (type of event)
- Tags
- Signature
- Creation timestamp

### Relays
Relays are servers that:
- Accept events from clients
- Store events
- Serve events to clients based on filters
- Handle real-time subscriptions

## Nostrify Architecture

### Core Components

#### NStore
The base interface for storing and querying Nostr events:
```typescript
interface NStore {
  event(): Promise<NostrEvent | undefined>;
  query(): Promise<NostrEvent[]>;
  count(): Promise<number>;
  remove(): Promise<void>;
}
```

#### NRelay
Extended storage with real-time capabilities:
```typescript
interface NRelay extends NStore {
  req(): AsyncIterable<NostrRelayMsg>;
}
```

#### NostrSigner
Interface for signing Nostr events:
```typescript
interface NostrSigner {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrEvent): Promise<NostrEvent>;
}
```

### Storage Implementations

1. **NCache**: In-memory cache with configurable size
2. **NDatabase**: SQL-based storage (SQLite, MySQL)
3. **NPostgres**: Optimized PostgreSQL implementation
4. **NDenoKv**: Deno KV-based storage

### Relay Implementations

1. **NRelay1**: Single relay connection
2. **NPool**: Multiple relay management
3. **NSimplePool**: Simplified relay pool for basic use cases

### Signer Implementations

1. **NSecSigner**: Private key-based signing
2. **NSeedSigner**: Seed phrase-based signing
3. **NPhraseSigner**: Mnemonic phrase-based signing
4. **NCustodial**: Delegated signing service

## Event Flow

1. Event Creation:
   - Client creates event object
   - Signer signs the event
   - Event is published to relay(s)

2. Event Storage:
   - Relay receives event
   - Event is validated
   - Event is stored in database

3. Event Retrieval:
   - Client subscribes to filters
   - Relay streams matching events
   - Events are processed by client

## Data Validation

Nostrify uses Zod schemas for robust data validation:
- Event structure validation
- Content type checking
- Custom validation rules

## Policy System

Policies provide filtering and control:
- Content moderation
- Spam prevention
- Authentication rules
- Custom business logic