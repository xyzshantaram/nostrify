# SolidJS Integration

The `@nostrify/solidjs` package provides SolidJS bindings for the Nostrify framework, enabling seamless integration of Nostr functionality into SolidJS applications. It offers context providers, hooks, and utilities to manage Nostr relay connections, user authentication, and state management in a way that follows SolidJS best practices.

## Installation

```bash
# Using npm
npm install @nostrify/solidjs @nostrify/nostrify solid-js

# Using Deno
import { NostrProvider, useNostr } from "jsr:@nostrify/solidjs";
```

## Core Components

### NostrProvider

The `NostrProvider` is the main context provider that gives your SolidJS application access to Nostr functionality. All components that need to access Nostr features must be descendants of this provider.

```tsx
import { NostrProvider } from '@nostrify/solidjs';
import { NPool, NRelay1 } from '@nostrify/nostrify';

function App() {
  const nostr = new NPool({
    open(url: string) {
      return new NRelay1(url);
    },
    reqRouter(filters) {
      return new Map(['wss://relay.example.com'].map((url) => [url, filters]));
    },
    eventRouter(event) {
      return ['wss://relay.example.com'];
    },
  });

  return (
    <NostrProvider appName="MyNostrApp" nostr={nostr}>
      {/* Your app components here */}
    </NostrProvider>
  );
}
```

#### Props

- `children` - Child components that will have access to the Nostr context
- `appName` - Name of your application (used for storage keys and NIP-89 "client" tags)
- `nostr` - An instance of `NPool` from `@nostrify/nostrify` for querying and publishing events

### useNostr Hook

The `useNostr` hook provides access to the Nostr context within components. It must be used within a component that is a descendant of `NostrProvider`.

```tsx
import { useNostr } from '@nostrify/solidjs';

function MyComponent() {
  const { nostr, appName } = useNostr();

  // Now you can use the nostr instance to query events, publish, etc.
  const handleFetchNotes = async () => {
    const notes = await nostr.query([{ kinds: [1], limit: 10 }]);
    // Process notes...
  };

  return (
    <div>
      <h2>Notes for {appName}</h2>
      <button onClick={handleFetchNotes}>Fetch Latest Notes</button>
      {/* Render your content */}
    </div>
  );
}
```

## Authentication Components

### NostrLoginProvider

The `NostrLoginProvider` manages Nostr user logins for your application. It handles storage and retrieval of login information from localStorage, as well as login state management.

```tsx
import { NostrLoginProvider } from '@nostrify/solidjs';

function AuthenticatedApp() {
  return (
    <NostrLoginProvider storageKey="my-app-nostr-logins">
      {/* Components that need access to login state */}
    </NostrLoginProvider>
  );
}
```

#### Props

- `children` - Child components that will have access to the login context
- `storageKey` - Key used to store and retrieve logins in localStorage

### useNostrLogin Hook

The `useNostrLogin` hook provides access to login state and functions within components. It must be used within a component that is a descendant of `NostrLoginProvider`.

```tsx
import { useNostrLogin } from '@nostrify/solidjs';

function LoginManager() {
  const { logins, addLogin, removeLogin, setLogin, clearLogins } = useNostrLogin();

  return (
    <div>
      <h2>Logged In Users</h2>
      <ul>
        {logins.map(login => (
          <li key={login.id}>
            {login.pubkey.slice(0, 8)}...
            <button onClick={() => setLogin(login.id)}>Set Active</button>
            <button onClick={() => removeLogin(login.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={clearLogins}>Clear All Logins</button>
    </div>
  );
}
```

### NLogin Class

The `NLogin` class provides utilities for creating and managing Nostr login credentials.

```tsx
import { NLogin } from '@nostrify/solidjs';

// Create a login from an nsec
const login = NLogin.fromNsec('nsec1...');

// Access properties
console.log(login.id);        // Unique identifier for this login
console.log(login.pubkey);    // Public key
console.log(login.type);      // Type of login (e.g., 'nsec')

// Sign an event (simplified example)
const signedEvent = await login.sign({
  kind: 1,
  content: 'Hello Nostr!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000)
});
```

#### Methods

- `static fromNsec(nsec: string)` - Create a login from an nsec private key
- `sign(event: NostrEventTemplate)` - Sign a Nostr event with this login's credentials
- `getPublicKey()` - Get the public key for this login

## NUser Class

The `NUser` class provides utilities for managing user data in the context of Nostr applications.

```tsx
import { NUser } from '@nostrify/solidjs';

// Create a user instance
const user = new NUser({
  pubkey: 'npub1...',
  // Additional user data can be provided
});

// Access user data
console.log(user.pubkey);  // Public key
console.log(user.name);    // User name (if available)
console.log(user.picture); // Profile picture URL (if available)
```

## Complete Example

Here's a complete example showing how to use the `@nostrify/solidjs` package to build a simple Nostr application:

```tsx
import { render } from 'solid-js/web';
import { createSignal, For, Show } from 'solid-js';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { 
  NLogin, 
  NostrLoginProvider, 
  NostrProvider, 
  useNostr, 
  useNostrLogin 
} from '@nostrify/solidjs';

function LoginForm() {
  const { addLogin } = useNostrLogin();
  const [nsec, setNsec] = createSignal('');
  const [error, setError] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setError('');

    try {
      if (!nsec().trim()) {
        throw new Error('Please enter a valid nsec');
      }

      const login = NLogin.fromNsec(nsec());
      addLogin(login);
      setNsec('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid nsec');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={nsec()}
        onInput={(e) => setNsec(e.currentTarget.value)}
        placeholder="Enter nsec"
      />
      <button type="submit">Login</button>
      <Show when={error()}>
        <div style={{ color: 'red' }}>{error()}</div>
      </Show>
    </form>
  );
}

function NotePublisher() {
  const { nostr } = useNostr();
  const { logins } = useNostrLogin();
  const [content, setContent] = createSignal('');

  const publishNote = async (e: Event) => {
    e.preventDefault();
    if (!logins.length || !content().trim()) return;
    
    const activeLogin = logins[0]; // Use first login
    
    const event = await activeLogin.sign({
      kind: 1,
      content: content(),
      tags: [],
      created_at: Math.floor(Date.now() / 1000)
    });
    
    await nostr.publish(event);
    setContent('');
  };

  return (
    <Show when={logins.length > 0}>
      <form onSubmit={publishNote}>
        <textarea 
          value={content()} 
          onInput={(e) => setContent(e.currentTarget.value)}
          placeholder="What's on your mind?"
        />
        <button type="submit">Publish Note</button>
      </form>
    </Show>
  );
}

function App() {
  const relays = ['wss://relay.damus.io', 'wss://relay.nostr.band'];

  const nostr = new NPool({
    open(url: string) {
      return new NRelay1(url);
    },
    reqRouter(filters) {
      return new Map(relays.map((url) => [url, filters]));
    },
    eventRouter(_event: NostrEvent) {
      return relays;
    },
  });

  return (
    <NostrProvider appName="NostrExample" nostr={nostr}>
      <NostrLoginProvider storageKey="nostr-example-logins">
        <h1>Nostrify SolidJS Example</h1>
        <LoginForm />
        <NotePublisher />
      </NostrLoginProvider>
    </NostrProvider>
  );
}

render(() => <App />, document.getElementById('root')!);
```

## Integration with Nostr Capabilities

The `@nostrify/solidjs` package is designed to work seamlessly with the core Nostrify framework. This means you can:

- Connect to multiple relays using `NPool`
- Sign events using different authentication methods
- Query and filter events based on Nostr specifications
- Subscribe to real-time updates using event streams

## Testing Utilities

The package includes test helpers in `test-helpers.ts` to facilitate testing of components that use Nostr functionality:

```tsx
import { render } from 'solid-testing-library';
import { createMockNostrProvider } from '@nostrify/solidjs/test-helpers';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render properly', () => {
    const { MockNostrProvider } = createMockNostrProvider({
      // Mock values and methods here
    });
    
    const { getByText } = render(() => (
      <MockNostrProvider>
        <MyComponent />
      </MockNostrProvider>
    ));
    
    expect(getByText('Expected text')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Provider Hierarchy**: Always ensure `NostrProvider` is at the top of your component tree, and wrap authentication-related components with `NostrLoginProvider`.

2. **Error Handling**: Implement proper error handling for network operations and user authentication.

3. **Performance**: For large lists of events, consider implementing pagination or virtualization.

4. **Security**: Never store or expose private keys (nsec) directly in your application state; use the `NLogin` class to handle secure key management.

5. **Relay Selection**: Choose relays that are appropriate for your application's needs and geographical user distribution.