# Scenario: Direct Messaging

> **Related Documentation:**
> - [Core Concepts](../../concepts/core-concepts.md) - Understanding encrypted events and NIP-04
> - [Profile Management](../scenarios/profile-management.md) - User lookup and key management
> - [Content Creation](../scenarios/content-creation.md) - Media sharing in messages
> - [Social Feed](../scenarios/social-feed.md) - User interaction patterns

This scenario implements encrypted direct messaging between users, including conversation management and message threading.

## Implementation

### 1. Message Provider Setup
> *Uses concepts from [Core Concepts - Event Flow](../../concepts/core-concepts.md#event-flow)*
> 
> *Implements encryption from [Core Concepts - Data Validation](../../concepts/core-concepts.md#data-validation)*

```typescript
// src/providers/MessageProvider.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useNostr, useCurrentUser } from '@nostrify/react';
// ... [previous implementation] ...
```

### 2. Encryption Utilities
> *Related to [Profile Management - Security Considerations](../scenarios/profile-management.md#security-considerations)*
> 
> *Uses key management from [Profile Management - Key Management Screen](../scenarios/profile-management.md#4-key-management-screen)*

```typescript
// src/utils/encryption.ts
import { getPublicKey, getSharedSecret, encrypt, decrypt } from 'nostr-tools';
// ... [previous implementation] ...
```

### 3. Conversation List Screen
> *Uses profile components from [Profile Management - Profile Provider](../scenarios/profile-management.md#1-profile-provider)*
> 
> *Shares list management with [Social Feed - Feed Screen Implementation](../scenarios/social-feed.md#2-feed-screen-implementation)*

```typescript
// src/screens/ConversationsScreen.tsx
import { View, FlatList, StyleSheet } from 'react-native';
// ... [previous implementation] ...
```

### 4. Chat Screen
> *Media handling shared with [Content Creation - Rich Media Embedding](../scenarios/content-creation.md#4-rich-media-embedding)*

```typescript
// src/screens/ChatScreen.tsx
import { useState, useEffect } from 'react';
import { View, FlatList, TextInput, StyleSheet } from 'react-native';
// ... [previous implementation] ...
```

### 5. New Conversation Screen
> *Uses user search from [Social Feed - Profile Navigation](../scenarios/social-feed.md#4-profile-navigation)*
> 
> *Integrates with [Profile Management - Profile Provider](../scenarios/profile-management.md#1-profile-provider)*

```typescript
// src/screens/NewConversationScreen.tsx
import { useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
// ... [previous implementation] ...
```

## Security Considerations
> *Implements security patterns from [Profile Management - Security Considerations](../scenarios/profile-management.md#security-considerations)*
> 
> *Uses encryption patterns from [Core Concepts - Data Validation](../../concepts/core-concepts.md#data-validation)*

## Performance Optimization

### 1. Message Batching
> *Uses caching strategy from [Core Concepts - Storage Implementations](../../concepts/core-concepts.md#storage-implementations)*
> 
> *Shares patterns with [Social Feed - Performance Considerations](../scenarios/social-feed.md#performance-considerations)*

```typescript
const batchMessages = (messages: Message[], batchSize = 20) => {
  // ... [previous implementation] ...
};
```

### 2. Conversation Caching
> *Implements caching from [Core Concepts - Storage Implementations](../../concepts/core-concepts.md#storage-implementations)*

```typescript
const useConversationCache = () => {
  // ... [previous implementation] ...
};
```

## Error Handling
> *Uses common patterns from [Core Concepts - Data Validation](../../concepts/core-concepts.md#data-validation)*
> 
> *Shares error handling with [Social Feed - Error Handling](../scenarios/social-feed.md#error-handling)*

```typescript
const handleMessageError = async (error: Error, retry: () => Promise<void>) => {
  // ... [previous implementation] ...
};
```

## Integration with Other Features

### Media Sharing
> *See [Content Creation - Upload Progress Component](../scenarios/content-creation.md#5-upload-progress-component)*

```typescript
const handleShareMedia = async (uri: string) => {
  const { uploadImage } = useContent();
  const url = await uploadImage(uri);
  await sendMessage(currentConversation.pubkey, url);
};
```

### Profile Viewing
> *See [Profile Management - Profile Screen](../scenarios/profile-management.md#2-profile-edit-screen)*

```typescript
const handleViewProfile = (pubkey: string) => {
  navigation.navigate('Profile', { screen: 'ViewProfile', params: { pubkey } });
};
```

## Best Practices

1. **Message Encryption**
   > *See [Core Concepts - Data Validation](../../concepts/core-concepts.md#data-validation)*
   - Always encrypt message content
   - Verify key ownership
   - Handle encryption errors gracefully

2. **Performance**
   > *See [Core Concepts - Storage Implementations](../../concepts/core-concepts.md#storage-implementations)*
   - Cache conversation history
   - Implement pagination
   - Optimize media loading

3. **Security**
   > *See [Profile Management - Security Considerations](../scenarios/profile-management.md#security-considerations)*
   - Secure key storage
   - Message verification
   - Privacy considerations