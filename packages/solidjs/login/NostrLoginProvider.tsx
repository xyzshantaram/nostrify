import { createEffect, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';

import { NostrLoginContext, type NostrLoginContextType } from './NostrLoginContext.ts';
import type { NLoginType } from './NLogin.ts';

/** Props for `NostrLoginProvider`. */
interface NostrLoginProviderProps {
  /** The child components that will have access to the context. */
  children: JSX.Element;
  /** The key used to store (and revive) the logins in localStorage. */
  storageKey: string;
}

/**
 * NostrLoginProvider is a SolidJS component that provides a context for managing Nostr logins.
 * It uses a store to handle the state of logins and stores them in localStorage.
 */
export function NostrLoginProvider(props: NostrLoginProviderProps) {
  // Initialize from localStorage if available
  const getInitialLogins = (): NLoginType[] => {
    try {
      const stored = localStorage.getItem(props.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse stored logins:', e);
      return [];
    }
  };

  // Create a solid-js store for logins
  const [logins, setLogins] = createStore<NLoginType[]>(getInitialLogins());

  // Save to localStorage whenever logins change
  createEffect(() => {
    try {
      localStorage.setItem(props.storageKey, JSON.stringify(logins));
    } catch (e) {
      console.error('Failed to save logins to localStorage:', e);
    }
  });

  // Create actions to modify the login store
  const addLogin = (login: NLoginType) => {
    // Filter out any existing login with the same ID first
    const filteredLogins = logins.filter((l) => l.id !== login.id);
    setLogins([...filteredLogins, login]);
  };

  const removeLogin = (id: string) => {
    setLogins(logins.filter((login) => login.id !== id));
  };

  const setLogin = (id: string) => {
    const login = logins.find((l) => l.id === id);
    if (!login) return;

    const filteredLogins = logins.filter((l) => l.id !== id);
    setLogins([login, ...filteredLogins]);
  };

  const clearLogins = () => {
    setLogins([]);
  };

  // Create the context value directly with our store and actions
  const context: NostrLoginContextType = {
    logins,
    addLogin,
    removeLogin,
    setLogin,
    clearLogins,
  };

  return (
    <NostrLoginContext.Provider value={context}>
      {props.children}
    </NostrLoginContext.Provider>
  );
}
