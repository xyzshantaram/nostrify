# Relay Management and Connections

## Understanding Relay Management

### Single Relay (NRelay1)

NRelay1 provides a connection to a single relay:

```typescript
const relay = new NRelay1('wss://relay.example.com');

// Subscribe to events
for await (const msg of relay.req([{ kinds: [1] }])) {
  if (msg[0] === 'EVENT') {
    console.log('New event:', msg[2]);
  }
}
```

### Relay Pool (NPool)

NPool manages multiple relay connections:

```typescript
const pool = new NPool({
  open: (url: string) => new NRelay1(url),
  reqRouter: (filters) => new Map([
    ['wss://relay1.com', filters],
    ['wss://relay2.com', filters]
  ]),
  eventRouter: (event) => [
    'wss://relay1.com',
    'wss://relay2.com'
  ]
});
```

## Connection Strategies

### Basic Connection
```typescript
const relays = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol'
];

const pool = new NPool({
  open: (url) => new NRelay1(url),
  reqRouter: (filters) => new Map(relays.map(url => [url, filters])),
  eventRouter: (_event) => relays
});
```

### Advanced Routing
```typescript
const pool = new NPool({
  open: (url) => new NRelay1(url),
  reqRouter: (filters) => {
    // Route different kinds to different relays
    if (filters.some(f => f.kinds?.includes(0))) {
      return new Map([['wss://metadata-relay.com', filters]]);
    }
    if (filters.some(f => f.kinds?.includes(1))) {
      return new Map([['wss://content-relay.com', filters]]);
    }
    return new Map();
  },
  eventRouter: (event) => {
    // Publish different kinds to different relays
    switch (event.kind) {
      case 0: return ['wss://metadata-relay.com'];
      case 1: return ['wss://content-relay.com'];
      default: return [];
    }
  }
});
```

## Error Handling

### Relay Errors
```typescript
class RelayError extends Error {
  constructor(
    message: string,
    public code: number,
    public url: string
  ) {
    super(message);
  }
}

// Handling relay errors
try {
  await relay.publish(event);
} catch (error) {
  if (error instanceof RelayError) {
    console.error(
      `Relay ${error.url} failed with code ${error.code}: ${error.message}`
    );
  }
}
```

### Connection Recovery
```typescript
class RetryingRelay extends NRelay1 {
  async connect() {
    let retries = 0;
    while (retries < 3) {
      try {
        await super.connect();
        return;
      } catch (error) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    throw new Error('Failed to connect after 3 retries');
  }
}
```

## Subscription Management

### Basic Subscription
```typescript
const subscription = pool.sub([{ kinds: [1], limit: 100 }]);

// Process events
for await (const msg of subscription) {
  if (msg[0] === 'EVENT') {
    processEvent(msg[2]);
  }
  if (msg[0] === 'EOSE') {
    // End of stored events
    break;
  }
}
```

### Real-time Updates
```typescript
const subscription = pool.sub([{ kinds: [1], since: Math.floor(Date.now() / 1000) }]);

// Keep subscription open for real-time updates
const process = async () => {
  for await (const msg of subscription) {
    if (msg[0] === 'EVENT') {
      processEvent(msg[2]);
    }
  }
};

// Start processing in background
process();

// Cleanup when done
subscription.unsubscribe();
```

## Performance Optimization

### Caching
```typescript
const cache = new NCache({ max: 1000 });
const cachedPool = new class extends NPool {
  async event(id: string) {
    // Check cache first
    const cached = await cache.event(id);
    if (cached) return cached;
    
    // Fallback to relay query
    const event = await super.event(id);
    if (event) {
      await cache.add(event);
    }
    return event;
  }
};
```

### Batch Processing
```typescript
const batchProcess = async (events: NostrEvent[]) => {
  const batches = [];
  for (let i = 0; i < events.length; i += 100) {
    batches.push(events.slice(i, i + 100));
  }
  
  for (const batch of batches) {
    await Promise.all(batch.map(processEvent));
  }
};
```

## Configuration Examples

### Development Setup
```typescript
const devPool = new NPool({
  open: (url) => new NRelay1(url, {
    timeout: 5000,
    logging: true
  }),
  reqRouter: (filters) => new Map([
    ['wss://local-relay.com:8080', filters]
  ]),
  eventRouter: (_event) => ['wss://local-relay.com:8080']
});
```

### Production Setup
```typescript
const prodPool = new NPool({
  open: (url) => new RetryingRelay(url, {
    timeout: 30000,
    logging: false
  }),
  reqRouter: (filters) => new Map([
    ['wss://relay1.com', filters],
    ['wss://relay2.com', filters],
    ['wss://relay3.com', filters]
  ]),
  eventRouter: (_event) => [
    'wss://relay1.com',
    'wss://relay2.com',
    'wss://relay3.com'
  ]
});
```