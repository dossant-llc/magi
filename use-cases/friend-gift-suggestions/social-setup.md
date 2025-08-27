# Social Setup: Friend-to-Friend mAgi Network

## Overview
This use case requires **two AGIfor.me systems** to communicate with each other, demonstrating the social/network capabilities of personal AI assistants.

## Network Architecture

### Peer-to-Peer mAgi Communication
```
Alex's mAgi                    Sarah's mAgi
(alex-personal.local)          (sarah-home.local)
       │                              │
       │  ┌─────────────────────────┐ │
       └──┤ Friend Request for Gift ├─┘
          │ Suggestion Query        │
          └─────────────────────────┘
                      │
          ┌─────────────────────────┐
          │ Auto-Approved Response  │
          │ (Filtered by Privacy)   │
          └─────────────────────────┘
```

### Discovery Methods
1. **Local Network**: mDNS discovery for same WiFi network
2. **Direct Connection**: IP address + port configuration  
3. **Secure Tunnel**: ngrok or similar for remote friends
4. **Future**: Decentralized identity system

## Friend Network Configuration

### 1. Sarah's Friend Whitelist (`memories/social/friends-whitelist.md`)
```markdown
---
privacy: private
tags: [social, friends, whitelist, permissions]
created: 2024-01-15
---

# My Friend Network & Permissions

## Close Friends (Auto-Approve Gift Queries)
### Alex Chen  
- **mAgi ID**: alex-personal.local:3001
- **Relationship**: College friend, 5+ years
- **Trust Level**: High
- **Auto-approve**: Gift suggestions, restaurant recommendations
- **Budget sharing**: Up to $100 gift suggestions
- **Last interaction**: 2024-01-20

### Emma Rodriguez
- **mAgi ID**: emma-magi.home:3001  
- **Relationship**: Coworker turned close friend, 2+ years
- **Trust Level**: High
- **Auto-approve**: Gift suggestions, local event recommendations
- **Budget sharing**: Up to $75 gift suggestions
- **Last interaction**: 2024-01-18

### Jordan Kim
- **mAgi ID**: j-magi.local:3001
- **Relationship**: Hiking buddy, 3+ years  
- **Trust Level**: Medium-High
- **Auto-approve**: Gift suggestions (outdoor gear), activity recommendations
- **Budget sharing**: Up to $50 gift suggestions
- **Last interaction**: 2024-01-15

## Family (Different Permissions)
### Mom
- **mAgi ID**: mom-assistant.family:3001
- **Relationship**: Mother
- **Trust Level**: High  
- **Auto-approve**: Health check-ins, family event planning
- **Special permissions**: Access to family calendar, medical info
- **Budget sharing**: No limits (she pays for everything anyway)

## Work Colleagues (Limited Access)
### Sarah Wilson (Different Sarah)
- **mAgi ID**: sarah-w.corp:8080
- **Relationship**: Work colleague, same team
- **Trust Level**: Medium
- **Auto-approve**: Work lunch recommendations only
- **Manual review**: Any personal queries
- **Budget sharing**: $20 max (coffee/lunch only)
```

### 2. Auto-Approval Policies (`memories/social/auto-approval-policies.md`)
```markdown
---
privacy: private
tags: [social, policies, automation, privacy]
created: 2024-01-10
---

# My Social Sharing Policies

## Gift Suggestion Policy (Close Friends Only)
**Triggers**: "gift", "present", "birthday", "holiday", "anniversary"
**Who**: Close friends whitelist only
**Budget Range**: $10 - $100
**Auto-Approve**: Yes

**Share These Categories**:
- Current hobbies and interests (personal privacy level)
- Wishlist items with prices (personal privacy level)  
- Recent purchases to avoid duplicates
- Gift preferences and dislikes
- Size/fit information for clothing
- Food allergies and dietary restrictions

**Never Share**:
- Exact income or financial stress
- Relationship problems or dating life
- Work complaints or office drama
- Health issues beyond basic allergies
- Family conflicts or personal struggles
- Expensive wishes meant for family/partner

**Duration**: 24 hours max, then delete shared data

## Restaurant Recommendation Policy (Close Friends + Family)
**Triggers**: "restaurant", "dinner", "lunch", "food recommendation"
**Who**: Close friends + family
**Auto-Approve**: Yes

**Share These Categories**:
- Favorite restaurants and cuisines
- Dietary restrictions and preferences
- Recent dining experiences (good/bad)
- Budget preferences for dining out

## Activity/Event Policy (Close Friends Only)
**Triggers**: "activity", "event", "weekend plans", "things to do"
**Who**: Close friends only
**Manual Review**: Yes (more personal context needed)

**Share These Categories**:
- Interests in local events
- Preferred activity types
- Schedule availability (general)
- Activity budget ranges
```

### 3. Gift Preferences Memory (`memories/personal/gift-preferences.md`)
```markdown
---
privacy: personal
tags: [gifts, preferences, shopping, birthdays]
share_with_friends: true
created: 2024-01-12
---

# My Gift Preferences & Guidelines

## What Makes Me Happy
- **Practical items I'll use regularly** (kitchen tools, workout gear)
- **Experiences we can share** (cooking class, concert tickets, hiking trip)
- **Local/artisan products** (support small businesses)
- **Books related to current hobbies** (sourdough, plants, hiking guides)
- **Consumable treats** (nice coffee, tea, gourmet snacks)

## Current Interests & Needs
- **Sourdough baking**: Always need tools, ingredients, inspiration
- **Indoor gardening**: Plants, planters, care accessories
- **Hiking**: Gear that makes trails more enjoyable
- **Korean skincare**: But I'm very picky about products
- **Home organization**: Storage solutions, organizational tools

## Please Avoid (Love the Thought Though!)
- **Scented candles**: Have 20+, apartment smells like a Bath & Body Works
- **Fast fashion accessories**: Trying to buy less, buy better  
- **Generic gift cards**: Feels impersonal, prefer specific store cards
- **Bulky decorative items**: Small apartment, running out of space
- **Expensive guilt-inducing gifts**: Makes me uncomfortable

## Size/Fit Information (for clothing gifts)
- **Tops**: Medium (prefer slightly loose fit)
- **Bottoms**: Size 8-10 depending on brand
- **Shoes**: 8.5, wide width
- **Jewelry**: Don't wear much, prefer simple/minimal

## Dietary Info (for food gifts)
- **Allergies**: Shellfish (severe), tree nuts (mild)
- **Preferences**: Love trying new cuisines, especially Korean and Mediterranean
- **Dietary style**: Mostly vegetarian at home, flexible when dining out
- **Cooking level**: Intermediate, love learning new techniques

## Budget Context (for friends' reference)
- **Sweet spot**: $25-50 feels perfect for birthdays
- **Higher end**: $75-100 okay for milestone birthdays or group gifts
- **Lower end**: $10-25 totally fine for holidays or "just because"
- **Experiences**: More flexible on budget, especially if shareable

## Recent Purchase History (to avoid duplicates)
- **December 2023**: New running shoes (well covered for a year)
- **January 2024**: Skincare routine overhaul (stocked up)  
- **January 2024**: 3 new plants (apartment getting crowded)
- **February 2024**: Sourdough cookbook and starter supplies
```

## Technical Implementation

### 1. mAgi Discovery Protocol
```typescript
interface MagiDiscovery {
  announce_service(): void;    // Broadcast availability on local network
  discover_friends(): MagiFriend[];  // Find friends' mAgi systems
  verify_identity(friend: MagiFriend): boolean;  // Confirm it's really them
}

interface MagiFriend {
  name: string;
  magi_id: string;  // Unique identifier
  ip_address: string;
  port: number;
  public_key: string;  // For encrypted communication
  last_seen: Date;
  trust_level: 'low' | 'medium' | 'high';
}
```

### 2. Friend Request Protocol
```typescript
interface FriendRequest {
  id: string;
  from_magi: string;
  to_magi: string;
  request_type: 'gift_suggestion' | 'restaurant_rec' | 'activity_rec';
  intent_description: string;
  context: {
    occasion?: string;
    budget_range?: [number, number];
    timeline?: string;
  };
  requested_categories: string[];
  timestamp: Date;
  expires_at: Date;
}

interface FriendResponse {
  request_id: string;
  status: 'approved' | 'denied' | 'partial';
  shared_data?: any;
  privacy_note: string;
  expires_at: Date;
}
```

### 3. Privacy Filtering Engine
```typescript
class SocialPrivacyFilter {
  constructor(private policies: SocialPrivacyPolicy[]) {}
  
  filterForFriend(
    friend: MagiFriend,
    requestType: string,
    memories: Memory[]
  ): FilteredMemorySet {
    const policy = this.getPolicyFor(friend, requestType);
    return memories
      .filter(m => this.isShareableCategory(m.category, policy))
      .map(m => this.redactSensitiveInfo(m, policy));
  }
  
  private redactSensitiveInfo(memory: Memory, policy: Policy): Memory {
    // Remove exact prices, personal details, etc.
    return {
      ...memory,
      content: this.applySafetyFilters(memory.content, policy)
    };
  }
}
```

### 4. Network Security
- **Encryption**: All friend-to-friend communication encrypted
- **Authentication**: Public key verification for friend identity
- **Rate Limiting**: Max 5 requests per friend per day  
- **Audit Logging**: All social interactions logged locally
- **Revocation**: Can instantly revoke friend access

## Setup Instructions

### 1. Enable Social Features
```bash
# In both friends' AGIfor.me systems
echo "ENABLE_SOCIAL_FEATURES=true" >> .env
echo "MAGI_NETWORK_PORT=3001" >> .env
echo "MAGI_DISCOVERY_ENABLED=true" >> .env

# Restart services
./start.sh --with-social
```

### 2. Add Friend Connection
```bash
# On Alex's system
npm run social:add-friend sarah-home.local 3001

# On Sarah's system  
npm run social:add-friend alex-personal.local 3001

# Verify connection
npm run social:list-friends
```

### 3. Configure Privacy Policies
Create the memory files shown above in each person's `memories/social/` folder.

### 4. Test Friend Discovery
```bash
# Check if friends' mAgi systems are discoverable
npm run social:discover

# Test basic communication
npm run social:ping sarah-home.local
```

This social setup enables the **friend gift suggestion** scenario while maintaining strong privacy controls and user agency over data sharing.