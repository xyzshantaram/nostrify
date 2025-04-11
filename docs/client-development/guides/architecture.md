# Architecture Guide

This guide covers the architectural patterns and best practices for building Nostr applications with Nostrify.

## Core Architecture

### Event Flow

```
User Action → Event Creation → Event Validation → Signing → Publishing → Relay Distribution
     ↑                                                                         ↓
     └─────────────── State Update ←─── Event Processing ←─── Event Reception
```

### Component Architecture

```typescript
// 1. Provider Layer
export function NostrProvider({ children }) {
  // Manages global state and relay connections
  return <NostrContext.Provider>{children}</NostrContext.Provider>;
}

// 2. Feature Layer
export function FeatureProvider({ children }) {
  // Manages feature-specific state and logic
  return <FeatureContext.Provider>{children}</FeatureContext.Provider>;
}

// 3. View Layer
export function FeatureView() {
  // Handles UI and user interactions
}
```

## State Management

### Event State

```typescript
interface EventState<T> {
  events: Map<string, ParsedEvent<T>>;
  loading: boolean;
  error: Error | null;
}

function useEventState<T>() {
  const [state, setState] = useState<EventState<T>>({
    events: new Map(),
    loading: true,
    error: null
  });

  const addEvent = useCallback((event: ParsedEvent<T>) => {
    setState(prev => ({
      ...prev,
      events: new Map(prev.events).set(event.id, event)
    }));
  }, []);

  return { state, addEvent };
}
```

### Subscription Management

```typescript
function useSubscription(filter: Filter) {
  useEffect(() => {
    const sub = relay.subscribe(filter);
    
    const cleanup = sub.on('event', (event) => {
      // Process event
    });

    return () => {
      cleanup();
      sub.close();
    };
  }, [filter]);
}
```

## Error Handling

### Centralized Error Handling

```typescript
interface ErrorState {
  type: 'network' | 'validation' | 'publishing';
  message: string;
  timestamp: number;
  retryable: boolean;
}

function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  const handleError = useCallback((error: Error, type: ErrorState['type']) => {
    setErrors(prev => [...prev, {
      type,
      message: error.message,
      timestamp: Date.now(),
      retryable: type === 'network'
    }]);
  }, []);

  return { errors, handleError };
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError;
}
```

## Performance Optimization

### Event Caching

```typescript
interface CacheConfig {
  maxAge: number;
  maxSize: number;
}

class EventCache<T> {
  private cache = new Map<string, {
    data: T;
    timestamp: number;
  }>();
  
  constructor(private config: CacheConfig) {}

  add(id: string, data: T) {
    this.cache.set(id, {s
      data,
      timestamp: Date.now()
    });
    
    this.prune();
  }

  private prune() {
    const now = Date.now();
    for (const [id, entry] of this.cache) {
      if (now - entry.timestamp > this.config.maxAge) {
        this.cache.delete(id);
      }
    }
  }
}
```

### Subscription Optimization

```typescript
function useOptimizedSubscription(filter: Filter) {
  const debouncedFilter = useDebounce(filter, 500);
  
  useEffect(() => {
    const sub = relay.subscribe(debouncedFilter);
    let mounted = true;

    const batch: Event[] = [];
    let timeout: NodeJS.Timeout;

    const processBatch = () => {
      if (mounted && batch.length > 0) {
        setEvents(prev => [...prev, ...batch]);
        batch.length = 0;
      }
    };

    const cleanup = sub.on('event', (event) => {
      batch.push(event);
      clearTimeout(timeout);
      timeout = setTimeout(processBatch, 100);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      cleanup();
      sub.close();
    };
  }, [debouncedFilter]);
}
```

## Testing Strategy

### Unit Testing Events

```typescript
describe('Event Creation', () => {
  it('should create valid events', () => {
    const event = createEvent({
      content: 'test',
      tags: [['tag', 'value']]
    });

    expect(validateEvent(event)).toBe(true);
    expect(event.kind).toBe(EXPECTED_KIND);
    expect(event.tags[0]).toEqual(['tag', 'value']);
  });
});
```

### Integration Testing

```typescript
describe('Relay Integration', () => {
  let relay: RelayConnection;
  
  beforeEach(() => {
    relay = new RelayConnection('wss://test.relay');
  });

  afterEach(() => {
    relay.close();
  });

  it('should handle connection failures', async () => {
    const error = await catchError(() => relay.connect());
    expect(error).toBeDefined();
    expect(relay.isConnected()).toBe(false);
  });
});
```

## Security Considerations

### Private Key Management

```typescript
class SecureKeyStorage {
  private static instance: SecureKeyStorage;
  private keys = new Map<string, CryptoKey>();

  static getInstance() {
    if (!this.instance) {
      this.instance = new SecureKeyStorage();
    }
    return this.instance;
  }

  async storeKey(id: string, key: string) {
    // Convert to CryptoKey and store securely
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    this.keys.set(id, cryptoKey);
  }

  async getKey(id: string): Promise<CryptoKey | null> {
    return this.keys.get(id) || null;
  }

  clear() {
    this.keys.clear();
  }
}
```

### Event Validation

```typescript
function validateUserEvent(event: Event): boolean {
  // Basic validation
  if (!validateEvent(event)) return false;

  // Content validation
  try {
    const content = JSON.parse(event.content);
    if (!content.text || typeof content.text !== 'string') return false;
    if (content.text.length > 1000) return false;
  } catch {
    return false;
  }

  // Tag validation
  const hasDuplicateTags = event.tags.some((tag, i) => 
    event.tags.findIndex(t => t[0] === tag[0]) !== i
  );
  if (hasDuplicateTags) return false;

  return true;
}
```

## Deployment Considerations

1. Use multiple relays for redundancy
2. Implement proper error handling
3. Monitor relay health
4. Cache frequently accessed data
5. Implement rate limiting
6. Use secure key storage
7. Validate all events
8. Handle network issues gracefully

## Common Pitfalls

1. Not validating event structure
2. Improper error handling
3. Memory leaks from unmanaged subscriptions
4. Not implementing reconnection logic
5. Poor performance from unoptimized queries
6. Insecure key management
7. Missing cleanup in components
8. Not handling network issues

## Next Steps

- Review the [Quick Start Guide](./quick-start.md)
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Explore example implementations
- Join the community for support