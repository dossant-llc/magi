# BrainXchange Integration Example

## Setup

```typescript
import { brainXchange } from './services/brainxchange';

// Connect and identify on startup
await brainXchange.connect();
await brainXchange.identify('igor@example.com', 'Igor Rodriguez');

// Set up handlers
brainXchange.onQuestion(async (content, from, fromNickname) => {
  console.log(`Question from ${fromNickname}: ${content}`);
  // Search brainbridge knowledge base
  const answer = await searchKnowledge(content);
  await brainXchange.answer(answer, from);
});

brainXchange.onAnswer((content, from, fromNickname) => {
  console.log(`Answer from ${fromNickname}: ${content}`);
});
```

## Friend Memory Integration

Store friends in `/memories/social/friends.md`:

```markdown
---
privacy: personal
tags: [friends, social, brainxchange]
---

# My Magi Friends

## Zack Chen
- **Username**: zack.sushi@gmail.com
- **Nickname**: Zack Chen  
- **Expertise**: Sushi, Japanese culture, food recommendations
- **Last connected**: 2024-08-27

## Sean Martinez  
- **Username**: sean.legal@lawfirm.com
- **Nickname**: Sean Martinez
- **Expertise**: Business law, licensing, legal advice
- **Last connected**: 2024-08-26
```

## Command Parsing

```typescript
// Parse magi commands
if (userInput.startsWith('magi ')) {
  const command = userInput.substring(5);
  
  if (command === 'create invite') {
    const invite = await brainXchange.createInvite();
    return `Share this code with your friend: ${invite.code}
    
Expires: ${invite.expiresIn}
They can connect by saying: "magi connect ${invite.code}"`;
  }
  
  if (command.startsWith('connect ')) {
    const code = command.split(' ')[1];
    try {
      const result = await brainXchange.connectWithCode(code);
      return `Connected to ${result.friend?.nickname}! You can now ask them questions.`;
    } catch (error) {
      return `Connection failed: ${error.message}`;
    }
  }
  
  if (command.startsWith('ask ')) {
    // Parse: "magi ask zack what's your favorite sushi?"
    const parts = command.substring(4); // Remove "ask "
    const match = parts.match(/^(\w+)\s+(.+)$/);
    
    if (match) {
      const [, friendName, question] = match;
      
      // Look up friend's username from memory
      const friend = await findFriendByName(friendName);
      if (friend) {
        await brainXchange.ask(question, friend.username);
        return `Question sent to ${friend.nickname}`;
      } else {
        return `Friend '${friendName}' not found. Available friends: ${getConnectedFriends().map(f => f.nickname).join(', ')}`;
      }
    }
  }
}
```

## Friend Lookup Functions

```typescript
async function findFriendByName(name: string) {
  // Search memories for friend info
  const friendsMemory = await readMemory('/memories/social/friends.md');
  // Parse and find friend by nickname or first name
  // Return {username, nickname} or null
}

function getConnectedFriends() {
  return brainXchange.getConnectedFriends();
}

async function searchKnowledge(question: string) {
  // Search brainbridge knowledge base
  // Return relevant answer from memories
}
```

## Natural Commands

Users can say:
- `"magi create invite"` → Generate invitation code
- `"magi connect ABC123"` → Connect with friend's code  
- `"magi ask zack what's your favorite sushi?"` → Ask specific friend
- `"magi ask anyone about React patterns"` → Ask any connected friend

## Example Flow

```
User: "magi create invite"
Magi: "Share this code: ABC123 (expires in 30 minutes)"

[User shares with Zack]

Zack: "magi connect ABC123" 
Zack's Magi: "Connected to Igor Rodriguez!"

User: "magi ask zack what's your favorite sushi?"
Magi: "Question sent to Zack Chen"

[Zack's magi searches his knowledge and responds]

Magi: "Answer from Zack Chen: My favorite is salmon nigiri and spicy tuna rolls!"

User: "magi ask @alice about her shrinking expertise"
Magi: "🔍 Looking for @alice on BrainXchange...
❌ User @alice not found in your connected friends.
Options to connect with @alice:
1. If you have an invitation code from @alice: magi connect ABC123
2. Create an invitation for @alice to use: magi create invite"
```

This creates a natural conversational interface for BrainXchange communication!