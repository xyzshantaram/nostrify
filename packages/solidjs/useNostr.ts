import { useContext } from 'solid-js';

import { NostrContext, type NostrContextType } from './NostrContext.ts';

/**
 * Hook to access the Nostr context.
 * Must be used within a NostrProvider.
 */
export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);

  if (!context.nostr) {
    throw new Error('useNostr must be used within a NostrProvider');
  }

  return context;
}
