# Troubleshooting Guide

## Common Event Creation Issues

### Event Validation Errors

The error `can't serialize event with wrong or missing properties` typically indicates issues with event structure. Events must exactly match this structure:

```typescript
interface NostrEvent {
  kind: number;        // Must be number type
  created_at: number;  // Must be number type (Unix timestamp)
  content: string;     // Must be string type
  pubkey: string;     // Must be 64-character hex string
  tags: string[][];    // Must be array of string arrays
  id?: string;        // Added by finalizeEvent
  sig?: string;       // Added by finalizeEvent
}
```

Common fixes:
- Ensure all fields have correct types
- Convert any non-string tag values to strings: `tag.map(item => String(item))`
- Don't include `id` or `sig` in the initial event - they're added by `finalizeEvent`
- Verify `pubkey` is exactly 64 characters and valid hex

### Signing Issues

When encountering signing errors:

```typescript
// Correct signing pattern
import { finalizeEvent } from 'nostr-tools';

const unsignedEvent = {
  kind: YOUR_KIND,
  created_at: Math.floor(Date.now() / 1000),
  content: "content",
  pubkey: getPublicKey(privateKey),
  tags: []
};

const signedEvent = finalizeEvent(unsignedEvent, privateKey);
```

Common issues:
- Using browser-specific APIs like `Buffer` (use `TextEncoder` instead)
- Incorrect private key format
- Missing or malformed event fields

### Browser Environment Issues

When working in browsers:

```typescript
// Use TextEncoder instead of Buffer
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Use web-safe APIs for crypto operations
const messageHash = sha256(stringToBytes(message));
```

## Relay Connection Problems

### Connection Management

```typescript
class RelayConnection {
  private ws: WebSocket | null = null;
  private messageQueue: string[] = [];
  private connectPromise: Promise<void> | null = null;

  async connect() {
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      // Handle connection states
      this.ws.onopen = () => {
        this.processQueue();
        resolve();
      };
      
      this.ws.onclose = () => {
        this.reconnect();
      };
    });

    return this.connectPromise;
  }

  private processQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.send(msg);
    }
  }
}
```

Best practices:
- Queue messages when disconnected
- Implement automatic reconnection
- Handle connection states properly
- Clean up resources on component unmount

## Event Publishing Workflow

### Complete Example

```typescript
async function publishEvent(event: Partial<Event>) {
  // 1. Validate input
  if (!event.content) throw new Error("Content required");

  // 2. Structure event
  const unsignedEvent = {
    kind: YOUR_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: String(event.content),
    pubkey: getPublicKey(privateKey),
    tags: [
      ['d', 'event-identifier'],
      ...(event.tags || []).map(tag => 
        tag.map(item => String(item))
      )
    ]
  };

  // 3. Sign event
  const signedEvent = finalizeEvent(unsignedEvent, privateKey);

  // 4. Publish to relays
  await Promise.all(
    relays.map(relay => relay.publish(signedEvent))
  );

  return signedEvent;
}
```

## Performance Optimization

### Event Deduplication

```typescript
function addEvent(events: Event[], newEvent: Event): Event[] {
  return events.some(e => e.id === newEvent.id) 
    ? events 
    : [newEvent, ...events];
}

// Usage in state updates
setEvents(prev => addEvent(prev, newEvent));
```

### Connection Pooling

```typescript
class RelayPool {
  private relays = new Map<string, RelayConnection>();

  addRelay(url: string) {
    if (!this.relays.has(url)) {
      this.relays.set(url, new RelayConnection(url));
    }
    return this.relays.get(url)!;
  }

  publish(event: Event) {
    return Promise.all(
      Array.from(this.relays.values())
        .map(relay => relay.publish(event))
    );
  }
}
```