# Building Nostr Clients with Nostrify

Welcome to the Nostrify client development documentation. This guide will help you build robust Nostr clients using best practices and proven patterns, with a focus on React implementations.

## Quick Start

### Basic Setup

```typescript
import { NostrProvider } from '@nostrify/react';

function App() {
  return (
    <NostrProvider>
      <YourApp />
    </NostrProvider>
  );
}
```

### Create Your First Component

```typescript
import { useNostr } from '@nostrify/react';

function NostrFeed() {
  const { events, publishEvent, loading } = useNostr({
    filter: {
      kinds: [1], // Text notes
      limit: 100
    }
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          {event.content}
        </div>
      ))}
    </div>
  );
}
```

## Core Concepts

### Event Structure

Every Nostr event must follow this structure:

```typescript
interface NostrEvent {
  kind: number;        // Event type
  created_at: number;  // Unix timestamp
  content: string;     // Event content
  pubkey: string;     // 64-char hex public key
  tags: string[][];   // Array of tag arrays
  id?: string;        // Added during signing
  sig?: string;       // Added during signing
}
```

### Event Flow

1. Create event
2. Validate structure
3. Sign event
4. Publish to relays
5. Handle responses

## Implementation Patterns

### Context Provider Pattern

```typescript
import { createContext, useContext, useState } from 'react';
import { Event } from 'nostr-tools';

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

### Event Publishing Pattern

```typescript
function EventPublisher() {
  const { publishEvent } = useNostr();
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await publishEvent({
        kind: 1,
        content,
        tags: [['t', 'nostrify']]
      });
      setContent('');
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
      />
      <button type="submit">Post</button>
    </form>
  );
}
```

### Subscription Pattern

```typescript
function SubscriptionComponent() {
  const { events, loading } = useNostr({
    filter: {
      kinds: [1],
      since: Math.floor(Date.now() / 1000) - 3600, // Last hour
      limit: 100
    },
    options: {
      autoUpdate: true,    // Listen for new events
      deduplicate: true    // Remove duplicates
    }
  });

  return (
    <div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <EventList events={events} />
      )}
    </div>
  );
}
```

## Common Use Cases

### Authentication

```typescript
function Login() {
  const { login } = useNostr();
  
  const handleLogin = async () => {
    try {
      await login();
      // Handle successful login
    } catch (err) {
      // Handle login error
    }
  };

  return <button onClick={handleLogin}>Login with Nostr</button>;
}
```

### Profile Management

```typescript
function Profile() {
  const { profile, updateProfile } = useNostr();
  
  const handleUpdate = async (data: ProfileData) => {
    try {
      await updateProfile(data);
      // Handle successful update
    } catch (err) {
      // Handle error
    }
  };

  return (
    <ProfileForm 
      initial={profile} 
      onSubmit={handleUpdate} 
    />
  );
}
```

### Real-time Updates

```typescript
function LiveFeed() {
  const { events, subscribe } = useNostr();

  useEffect(() => {
    const unsubscribe = subscribe({
      kinds: [1],
      limit: 100
    }, {
      onEvent: (event) => {
        // Handle new event
      },
      onEose: () => {
        // Handle end of stored events
      }
    });

    return () => unsubscribe();
  }, []);

  return <EventList events={events} />;
}
```

## Error Handling

### Error Boundary

```typescript
class NostrErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Event Publishing Error Handling

```typescript
async function publishWithRetry(event: Event, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await publishEvent(event);
      return;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

## Best Practices

1. Always validate events before publishing
2. Implement proper error handling
3. Clean up subscriptions in useEffect
4. Use TypeScript for type safety
5. Follow security guidelines
6. Optimize performance
7. Handle network issues gracefully

## Advanced Topics

For more detailed information, check out:
- [Architecture Guide](./guides/architecture.md)
- [Troubleshooting Guide](./guides/troubleshooting.md)

## Examples

Check the [examples](../examples) directory for complete implementations:
- Basic client
- Social feed
- Direct messaging
- Content creation

## Contributing

We welcome contributions! Please check our [Contributing Guide](../../CONTRIBUTING.md) for details.

## Support

- Join our community
- Check GitHub issues
- Read the troubleshooting guide

## Next Steps

1. Try the examples
2. Build your first client
3. Join the community
4. Contribute to Nostrify