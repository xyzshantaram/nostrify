# Quick Start Guide

This guide will help you quickly implement a Nostr client using Nostrify. We'll cover the basic patterns and best practices for common tasks.

## Basic Setup

### 1. Context Provider

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { Event, getPublicKey, finalizeEvent } from 'nostr-tools';

interface NostrContextType {
  publishEvent: (event: Partial<Event>) => Promise<void>;
  events: Event[];
  loading: boolean;
  error: string | null;
}

const NostrContext = createContext<NostrContextType | null>(null);

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Implementation...

  return (
    <NostrContext.Provider value={{ publishEvent, events, loading, error }}>
      {children}
    </NostrContext.Provider>
  );
}
```

### 2. Event Publishing

```typescript
const publishEvent = async (event: Partial<Event>) => {
  try {
    const unsignedEvent = {
      kind: YOUR_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      content: String(event.content || ''),
      pubkey: getPublicKey(privateKey),
      tags: [
        ['d', 'your-event-identifier'],
        ...(event.tags || [])
      ]
    };

    const signedEvent = finalizeEvent(unsignedEvent, privateKey);
    await relay.publish(signedEvent);
    
    setEvents(prev => [signedEvent, ...prev]);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to publish');
    throw e;
  }
};
```

### 3. Relay Connection

```typescript
useEffect(() => {
  const relays = ['wss://relay1.com', 'wss://relay2.com']
    .map(url => new RelayConnection(url));

  // Subscribe to events
  const subs = relays.map(relay => 
    relay.subscribe({
      kinds: [YOUR_EVENT_KIND],
      limit: 100
    })
  );

  return () => {
    subs.forEach(sub => sub.close());
    relays.forEach(relay => relay.close());
  };
}, []);
```

## Common Patterns

### 1. Event Type Identification

```typescript
// Use 'd' tag for event type
const eventBase = {
  kind: YOUR_KIND,
  tags: [['d', 'event-type-identifier']]
};

// Filter incoming events
const isRelevantEvent = (event: Event) => 
  event.tags.some(t => t[0] === 'd' && t[1] === 'event-type-identifier');
```

### 2. Data Structure

```typescript
// Structured data in tags
const createEvent = (data: YourDataType) => ({
  content: JSON.stringify(data.content),
  tags: [
    ['d', 'event-type'],
    ['category', data.category],
    ['reference', data.refId],
    // Add more structured data
  ]
});
```

### 3. Event Parsing

```typescript
interface ParsedEvent<T> {
  id: string;
  pubkey: string;
  content: T;
  created_at: number;
  metadata: {
    category?: string;
    reference?: string;
  };
}

function parseEvent<T>(event: Event): ParsedEvent<T> {
  return {
    id: event.id,
    pubkey: event.pubkey,
    content: JSON.parse(event.content),
    created_at: event.created_at,
    metadata: {
      category: event.tags.find(t => t[0] === 'category')?.[1],
      reference: event.tags.find(t => t[0] === 'reference')?.[1]
    }
  };
}
```

## Component Integration

### 1. Using the Context

```typescript
function YourComponent() {
  const { events, publishEvent, loading, error } = useNostr();
  const [newContent, setNewContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await publishEvent({
        content: newContent,
        tags: [['category', 'your-category']]
      });
      setNewContent('');
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
        />
        <button type="submit">Post</button>
      </form>

      <div className="events">
        {events.map(event => (
          <EventDisplay key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
```

### 2. Error Boundaries

```typescript
class NostrErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>Error in Nostr component: {this.state.error?.message}</div>;
    }

    return this.props.children;
  }
}
```

## Best Practices

1. Always validate event structure before publishing
2. Use TypeScript for better type safety
3. Implement proper error handling
4. Clean up subscriptions and connections
5. Use event deduplication
6. Implement reconnection logic
7. Queue messages during disconnections
8. Use error boundaries for component failures

## Next Steps

- Check the [Troubleshooting Guide](./troubleshooting.md) for common issues
- Explore advanced patterns in the [Architecture Guide](./architecture.md)
- See real-world examples in the [Examples](../examples/) directory