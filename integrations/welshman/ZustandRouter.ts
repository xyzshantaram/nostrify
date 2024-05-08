import { RelayMode, Router } from '@welshman/util';
import { create, StoreApi, UseBoundStore } from 'zustand';

export interface ZustandRouterState {
  userPubkey: string | null;
  groupRelays: Map<string, Set<string>>;
  communityRelays: Map<string, Set<string>>;
  pubkeyRelays: Map<string, Set<string>>;
  staticRelays: Set<string>;
  indexerRelays: Set<string>;
  searchRelays: Set<string>;
  relayQuality: Map<string, number>;
  redundancy: number;
  limit: number;
  setUserPubkey: (userPubkey: string | null) => void;
  addGroupRelay: (relay: string, address: string) => void;
  removeGroupRelay: (relay: string, address: string) => void;
  addCommunityRelay: (relay: string, address: string) => void;
  removeCommunityRelay: (relay: string, address: string) => void;
  addPubkeyRelay: (relay: string, pubkey: string, mode?: RelayMode) => void;
  removePubkeyRelay: (relay: string, pubkey: string) => void;
  addStaticRelay: (relay: string) => void;
  removeStaticRelay: (relay: string) => void;
  addIndexerRelay: (relay: string) => void;
  removeIndexerRelay: (relay: string) => void;
  addSearchRelay: (relay: string) => void;
  removeSearchRelay: (relay: string) => void;
  setRelayQuality: (relay: string, quality: number) => void;
  setRedundancy: (redundancy: number) => void;
  setLimit: (limit: number) => void;
}

export class ZustandRouter extends Router {
  useStore: UseBoundStore<StoreApi<ZustandRouterState>>;

  constructor() {
    const useStore = create<ZustandRouterState>((set) => ({
      userPubkey: null,
      groupRelays: new Map(),
      communityRelays: new Map(),
      pubkeyRelays: new Map(),
      staticRelays: new Set(),
      indexerRelays: new Set(),
      searchRelays: new Set(),
      relayQuality: new Map(),
      redundancy: 2,
      limit: 10,
      setUserPubkey: (userPubkey: string | null) => set({ userPubkey }),
      addGroupRelay: (relay: string, address: string) =>
        set((state) => ({
          groupRelays: new Map(
            Array.from(state.groupRelays).map(([addr, relays]) => [
              addr,
              addr === address ? new Set([...relays, relay]) : relays,
            ]),
          ),
        })),
      removeGroupRelay: (relay: string, address: string) =>
        set((state) => ({
          groupRelays: new Map(
            Array.from(state.groupRelays).map(([addr, relays]) => [
              addr,
              addr === address ? new Set([...relays].filter((r) => r !== relay)) : relays,
            ]),
          ),
        })),
      addCommunityRelay: (relay: string, address: string) =>
        set((state) => ({
          communityRelays: new Map(
            Array.from(state.communityRelays).map(([addr, relays]) => [
              addr,
              addr === address ? new Set([...relays, relay]) : relays,
            ]),
          ),
        })),
      removeCommunityRelay: (relay: string, address: string) =>
        set((state) => ({
          communityRelays: new Map(
            Array.from(state.communityRelays).map(([addr, relays]) => [
              addr,
              addr === address ? new Set([...relays].filter((r) => r !== relay)) : relays,
            ]),
          ),
        })),
      addPubkeyRelay: (relay: string, pubkey: string) =>
        set((state) => ({
          pubkeyRelays: new Map(
            Array.from(state.pubkeyRelays).map(([pub, relays]) => [
              pub,
              pub === pubkey ? new Set([...relays, relay]) : relays,
            ]),
          ),
        })),
      removePubkeyRelay: (relay: string, pubkey: string) =>
        set((state) => ({
          pubkeyRelays: new Map(
            Array.from(state.pubkeyRelays).map(([pub, relays]) => [
              pub,
              pub === pubkey ? new Set([...relays].filter((r) => r !== relay)) : relays,
            ]),
          ),
        })),
      addStaticRelay: (relay: string) => set((state) => ({ staticRelays: new Set([...state.staticRelays, relay]) })),
      removeStaticRelay: (relay: string) =>
        set((state) => ({ staticRelays: new Set([...state.staticRelays].filter((r) => r !== relay)) })),
      addIndexerRelay: (relay: string) => set((state) => ({ indexerRelays: new Set([...state.indexerRelays, relay]) })),
      removeIndexerRelay: (relay: string) =>
        set((state) => ({ indexerRelays: new Set([...state.indexerRelays].filter((r) => r !== relay)) })),
      addSearchRelay: (relay: string) => set((state) => ({ searchRelays: new Set([...state.searchRelays, relay]) })),
      removeSearchRelay: (relay: string) =>
        set((state) => ({ searchRelays: new Set([...state.searchRelays].filter((r) => r !== relay)) })),
      setRelayQuality: (relay: string, quality: number) =>
        set((state) => ({ relayQuality: new Map(state.relayQuality).set(relay, quality) })),
      setRedundancy: (redundancy: number) => set({ redundancy }),
      setLimit: (limit: number) => set({ limit }),
    }));

    super({
      getUserPubkey: (): string | null => useStore.getState().userPubkey,
      getGroupRelays: (address: string): string[] => Array.from(useStore.getState().groupRelays.get(address) ?? []),
      getCommunityRelays: (address: string): string[] =>
        Array.from(useStore.getState().communityRelays.get(address) ?? []),
      getPubkeyRelays: (pubkey: string): string[] => Array.from(useStore.getState().pubkeyRelays.get(pubkey) ?? []),
      getStaticRelays: (): string[] => Array.from(useStore.getState().staticRelays),
      getIndexerRelays: (): string[] => Array.from(useStore.getState().indexerRelays),
      getSearchRelays: (): string[] => Array.from(useStore.getState().searchRelays),
      getRelayQuality: (url: string): number => useStore.getState().relayQuality.get(url) ?? 1,
      getRedundancy: (): number => useStore.getState().redundancy,
      getLimit: (): number => useStore.getState().limit,
    });

    this.useStore = useStore;
  }

  get state(): ZustandRouterState {
    return this.useStore.getState();
  }

  setUserPubkey(userPubkey: string | null): void {
    this.state.setUserPubkey(userPubkey);
  }

  addGroupRelay(relay: string, address: string): void {
    this.state.addGroupRelay(relay, address);
  }

  removeGroupRelay(relay: string, address: string): void {
    this.state.removeGroupRelay(relay, address);
  }

  addCommunityRelay(relay: string, address: string): void {
    this.state.addCommunityRelay(relay, address);
  }

  removeCommunityRelay(relay: string, address: string): void {
    this.state.removeCommunityRelay(relay, address);
  }

  addPubkeyRelay(relay: string, pubkey: string, mode?: RelayMode): void {
    this.state.addPubkeyRelay(relay, pubkey, mode);
  }

  removePubkeyRelay(relay: string, pubkey: string): void {
    this.state.removePubkeyRelay(relay, pubkey);
  }

  addStaticRelay(relay: string): void {
    this.state.addStaticRelay(relay);
  }

  removeStaticRelay(relay: string): void {
    this.state.removeStaticRelay(relay);
  }

  addIndexerRelay(relay: string): void {
    this.state.addIndexerRelay(relay);
  }

  removeIndexerRelay(relay: string): void {
    this.state.removeIndexerRelay(relay);
  }

  addSearchRelay(relay: string): void {
    this.state.addSearchRelay(relay);
  }

  removeSearchRelay(relay: string): void {
    this.state.removeSearchRelay(relay);
  }

  setRelayQuality(relay: string, quality: number): void {
    this.state.setRelayQuality(relay, quality);
  }

  setRedundancy(redundancy: number): void {
    this.state.setRedundancy(redundancy);
  }

  setLimit(limit: number): void {
    this.state.setLimit(limit);
  }
}
