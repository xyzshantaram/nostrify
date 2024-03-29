export interface NPubkeyRelay {
  pubkey: string;
  relay: WebSocket['url'];
  source: string;
  weight: number;
}

export interface NOutbox {
  /** Track a relay-pubkey association. */
  add(pr: NPubkeyRelay): Promise<void>;
  /** Get the relay with the highest weight. */
  get(pubkey: string): Promise<NPubkeyRelay>;
}
