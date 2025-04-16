import { useContext } from 'solid-js';
import { NostrLoginContext, type NostrLoginContextType } from './NostrLoginContext.ts';

/**
 * Hook to access the Nostr login context.
 * Must be used within a NostrLoginProvider.
 */
export function useNostrLogin(): NostrLoginContextType {
  const context = useContext(NostrLoginContext);
  return context;
}
