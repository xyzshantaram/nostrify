# Security and Authentication

## Signer Implementations

### NSecSigner
```typescript
import { NSecSigner } from '@nostrify/nostrify';

const signer = new NSecSigner(privateKey);
const pubkey = await signer.getPublicKey();

// Sign an event
const event = await signer.signEvent({
  kind: 1,
  content: 'Hello Nostr!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000)
});
```

### NSeedSigner
```typescript
import { NSeedSigner } from '@nostrify/nostrify';

const signer = new NSeedSigner(seed);
const pubkey = await signer.getPublicKey();

// Derive multiple keys from same seed
const derivedSigner = signer.derive(path);
```

### NPhraseSigner
```typescript
import { NPhraseSigner } from '@nostrify/nostrify';

const signer = new NPhraseSigner(mnemonic);
const pubkey = await signer.getPublicKey();

// BIP39 mnemonic support
const newSigner = NPhraseSigner.generate(); // Creates new mnemonic
```

### NCustodial
```typescript
import { NCustodial } from '@nostrify/nostrify';

const signer = new NCustodial(apiEndpoint, token);
const pubkey = await signer.getPublicKey();

// Sign via API
const event = await signer.signEvent(unsignedEvent);
```

## Key Management

### Secure Storage
```typescript
class SecureKeyStorage {
  private storage: Storage;

  async saveKey(key: string, password: string) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptedKey = await this.encrypt(key, password, salt);
    
    this.storage.setItem('nostr_key', JSON.stringify({
      encrypted: encryptedKey,
      salt: Buffer.from(salt).toString('hex')
    }));
  }

  async loadKey(password: string) {
    const data = JSON.parse(this.storage.getItem('nostr_key') || '{}');
    if (!data.encrypted) return null;
    
    const salt = Buffer.from(data.salt, 'hex');
    return this.decrypt(data.encrypted, password, salt);
  }

  private async encrypt(key: string, password: string, salt: Uint8Array) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(key)
    );

    return {
      iv: Buffer.from(iv).toString('hex'),
      data: Buffer.from(encrypted).toString('hex')
    };
  }

  private async decrypt(encrypted: any, password: string, salt: Uint8Array) {
    // Decryption implementation
  }
}
```

## NIP-07 Integration

### Window.nostr Implementation
```typescript
class NIP07Provider {
  private signer: NostrSigner;

  constructor(signer: NostrSigner) {
    this.signer = signer;
  }

  async getPublicKey(): Promise<string> {
    return this.signer.getPublicKey();
  }

  async signEvent(event: NostrEvent): Promise<NostrEvent> {
    return this.signer.signEvent(event);
  }

  // Optional NIP-07 methods
  async getRelays(): Promise<{ [url: string]: { read: boolean; write: boolean; } }> {
    return {
      'wss://relay.example.com': { read: true, write: true }
    };
  }

  async signSchnorr(message: string): Promise<string> {
    // Implement Schnorr signature
    throw new Error('Not implemented');
  }
}

// Install provider
if (typeof window !== 'undefined') {
  window.nostr = new NIP07Provider(signer);
}
```

## Authentication Flow

### Login Process
```typescript
class NostrLogin {
  private signers: Map<string, NostrSigner> = new Map();
  private currentSigner?: NostrSigner;

  async login(method: 'nip07' | 'nsec' | 'seed', params: any) {
    let signer: NostrSigner;

    switch (method) {
      case 'nip07':
        signer = await this.loginWithNIP07();
        break;
      case 'nsec':
        signer = new NSecSigner(params.nsec);
        break;
      case 'seed':
        signer = new NSeedSigner(params.seed);
        break;
      default:
        throw new Error('Unknown login method');
    }

    const pubkey = await signer.getPublicKey();
    this.signers.set(pubkey, signer);
    this.currentSigner = signer;

    return pubkey;
  }

  private async loginWithNIP07() {
    if (!window.nostr) {
      throw new Error('NIP-07 provider not found');
    }

    const pubkey = await window.nostr.getPublicKey();
    return {
      getPublicKey: () => pubkey,
      signEvent: (event: NostrEvent) => window.nostr.signEvent(event)
    };
  }
}
```

## Security Best Practices

### Event Validation
```typescript
class EventValidator {
  validate(event: NostrEvent): boolean {
    // Check required fields
    if (!this.hasRequiredFields(event)) return false;

    // Validate timestamps
    if (!this.hasValidTimestamp(event)) return false;

    // Verify signature
    if (!this.hasValidSignature(event)) return false;

    // Content validation
    if (!this.hasValidContent(event)) return false;

    return true;
  }

  private hasRequiredFields(event: NostrEvent): boolean {
    return !!(
      event.id &&
      event.pubkey &&
      event.created_at &&
      event.kind &&
      Array.isArray(event.tags) &&
      typeof event.content === 'string' &&
      event.sig
    );
  }

  private hasValidTimestamp(event: NostrEvent): boolean {
    const now = Math.floor(Date.now() / 1000);
    return event.created_at <= now && 
           event.created_at > now - 60 * 60 * 24 * 30; // 30 days
  }

  private hasValidSignature(event: NostrEvent): boolean {
    // Implement signature verification
    return true;
  }

  private hasValidContent(event: NostrEvent): boolean {
    // Implement content validation based on kind
    return true;
  }
}
```

### Rate Limiting
```typescript
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly window = 60000; // 1 minute
  private readonly limit = 100;

  isAllowed(pubkey: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(pubkey) || [];
    
    // Remove old attempts
    const recent = attempts.filter(time => time > now - this.window);
    
    if (recent.length >= this.limit) {
      return false;
    }
    
    recent.push(now);
    this.attempts.set(pubkey, recent);
    return true;
  }
}
```

### Content Policy
```typescript
class ContentPolicy {
  private policies: NPolicy[] = [];

  addPolicy(policy: NPolicy) {
    this.policies.push(policy);
  }

  async validateEvent(event: NostrEvent): Promise<boolean> {
    for (const policy of this.policies) {
      if (!await policy.allows(event)) {
        return false;
      }
    }
    return true;
  }
}

// Usage
const policy = new ContentPolicy();
policy.addPolicy(new SizePolicy({ maxSize: 1024 * 64 }));
policy.addPolicy(new PowPolicy({ difficulty: 8 }));
policy.addPolicy(new RegexPolicy({ pattern: /^[a-zA-Z0-9\s]*$/ }));
```