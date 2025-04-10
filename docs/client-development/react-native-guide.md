# Building a Nostr Client with React Native

## Setup and Configuration

### Basic Setup
```typescript
import { NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrProvider } from './NostrProvider';

const App = () => {
  const relays = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band'
  ];

  return (
    <NostrProvider
      appName="MyNostrApp"
      relays={relays}
    >
      {/* Your app components */}
    </NostrProvider>
  );
};
```

### Nostr Context Setup
```typescript
interface NostrContextType {
  appName: string;
  nostr: NPool;
}

const NostrContext = createContext<NostrContextType | undefined>(undefined);
```

## User Authentication

### Login Provider
```typescript
interface NostrLoginState {
  currentUser?: NUser;
  signers: NostrSigner[];
}

const NostrLoginProvider: FC<NostrLoginProviderProps> = ({
  children,
  initialSigners = [],
}) => {
  const [state, dispatch] = useNostrLoginReducer(initialSigners);
  
  return (
    <NostrLoginContext.Provider value={{ state, dispatch }}>
      {children}
    </NostrLoginContext.Provider>
  );
};
```

### Using Authentication Hooks
```typescript
const useCurrentUser = () => {
  const { state } = useNostrLogin();
  return state.currentUser;
};

const useLoginActions = () => {
  const { dispatch } = useNostrLogin();
  
  return {
    login: async (signer: NostrSigner) => {
      dispatch({ type: 'ADD_SIGNER', signer });
    },
    logout: () => {
      dispatch({ type: 'LOGOUT' });
    }
  };
};
```

## Event Handling

### Social Feed Implementation
```typescript
const useSocialFeed = (filters: NostrFilter[]) => {
  const nostr = useNostr();
  const [events, setEvents] = useState<NostrEvent[]>([]);

  useEffect(() => {
    const subscription = nostr.sub(filters);
    
    for await (const msg of subscription) {
      if (msg[0] === 'EVENT') {
        setEvents(prev => [...prev, msg[2]]);
      }
    }
    
    return () => subscription.unsubscribe();
  }, [filters]);

  return events;
};
```

### Author Information
```typescript
const useAuthor = (pubkey: string) => {
  const nostr = useNostr();
  const [metadata, setMetadata] = useState<NostrMetadata>();

  useEffect(() => {
    const fetchMetadata = async () => {
      const events = await nostr.query([{
        kinds: [0],
        authors: [pubkey]
      }]);
      if (events.length > 0) {
        setMetadata(JSON.parse(events[0].content));
      }
    };
    
    fetchMetadata();
  }, [pubkey]);

  return metadata;
};
```

## Component Examples

### Post Component
```typescript
const Post: FC<{ event: NostrEvent }> = ({ event }) => {
  const author = useAuthor(event.pubkey);
  
  return (
    <View style={styles.post}>
      <Text style={styles.author}>{author?.name || event.pubkey}</Text>
      <Text style={styles.content}>{event.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(event.created_at * 1000).toLocaleString()}
      </Text>
    </View>
  );
};
```

### Feed Component
```typescript
const Feed: FC = () => {
  const filters = [{
    kinds: [1], // text notes
    limit: 20
  }];
  
  const events = useSocialFeed(filters);
  
  return (
    <FlatList
      data={events}
      renderItem={({ item }) => <Post event={item} />}
      keyExtractor={event => event.id}
    />
  );
};
```

## Best Practices

1. **State Management**
   - Use context for global state
   - Implement proper cleanup in useEffect
   - Handle loading and error states

2. **Performance**
   - Implement virtual scrolling for long lists
   - Use memo for expensive computations
   - Batch state updates

3. **Error Handling**
   - Implement retry logic for failed relay connections
   - Have fallback UI for network issues
   - Log errors appropriately

4. **Security**
   - Never expose private keys
   - Validate all incoming data
   - Implement proper key management

5. **Testing**
   - Test components in isolation
   - Mock relay connections
   - Test error scenarios