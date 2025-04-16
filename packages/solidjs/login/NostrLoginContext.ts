import { createContext } from 'solid-js';
import type { Store } from 'solid-js/store';

import type { NLoginType } from './NLogin.ts';

/**
 * NostrLoginContextType defines the shape of the context that will be provided
 * to components that need access to the Nostr login state.
 */
export type NostrLoginContextType = {
  /** The list of Nostr logins as a reactive store. */
  logins: Store<NLoginType[]>;
  /** Add a login to the state. */
  addLogin: (login: NLoginType) => void;
  /** Remove a login from the state. */
  removeLogin: (loginId: string) => void;
  /** Set the user's current login (by moving it to the top of the state). */
  setLogin: (loginId: string) => void;
  /** Clear the login state. */
  clearLogins: () => void;
};

// Default empty implementation to avoid undefined errors
const defaultContext: NostrLoginContextType = {
  logins: [] as unknown as Store<NLoginType[]>,
  addLogin: () => {},
  removeLogin: () => {},
  setLogin: () => {},
  clearLogins: () => {},
};

/**
 * NostrLoginContext is a SolidJS context that provides access to the Nostr login state
 * and functions to update the state.
 */
export const NostrLoginContext = createContext<NostrLoginContextType>(defaultContext);
