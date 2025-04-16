import { type JSX } from 'solid-js';
import { NostrContext, type NostrContextType } from './NostrContext.ts';

/** Props for `NostrProvider`. */
interface NostrProviderProps {
  /** The child components that will have access to the context. */
  children: JSX.Element;
  /** Name of the application used for storage keys and NIP-89 "client" tags. */
  appName: string;
  /** The Nostr relay pool for querying and publishing events */
  nostr: NostrContextType['nostr'];
}

/**
 * NostrProvider is a SolidJS component that provides a context for Nostr functionality.
 * All components that use the useNostr hook must be wrapped in this provider.
 */
export function NostrProvider(props: NostrProviderProps) {
  return (
    <NostrContext.Provider value={props}>
      {props.children}
    </NostrContext.Provider>
  );
}
