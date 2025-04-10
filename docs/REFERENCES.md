# Documentation Cross-Reference Index

## Core Concepts
Located in `docs/concepts/core-concepts.md`
- Links to implementation details in scenario docs
- References storage implementations
- References security patterns

## Scenarios
Each scenario document contains implementations that may reference:
- Core concepts
- Other scenarios
- Common patterns
- Shared components

### Relationships Map

1. **Social Feed** (`scenarios/social-feed.md`)
   - References:
     - Core Concepts: Event handling, Relay communication
     - Profile Management: User metadata
     - Content Creation: Post rendering
     - Direct Messaging: User interactions

2. **Direct Messaging** (`scenarios/direct-messaging.md`)
   - References:
     - Core Concepts: Encryption, Event handling
     - Profile Management: User lookup
     - Content Creation: Media sharing
     - Social Feed: User interaction patterns

3. **Content Creation** (`scenarios/content-creation.md`)
   - References:
     - Core Concepts: Event creation, Media handling
     - Social Feed: Post integration
     - Profile Management: Author metadata
     - Direct Messaging: Media sharing patterns

4. **Profile Management** (`scenarios/profile-management.md`)
   - References:
     - Core Concepts: Metadata events, Key management
     - Social Feed: Profile display
     - Content Creation: Avatar handling
     - Security patterns

## Common Patterns
Found across multiple scenarios:
- State management with Context
- Error handling
- Performance optimization
- Security considerations
- Media handling
- Event processing

## Implementation Guidelines
When referencing other documents:
- Use relative paths for links
- Indicate when implementations can be shared
- Note any dependencies between features
- Highlight security implications