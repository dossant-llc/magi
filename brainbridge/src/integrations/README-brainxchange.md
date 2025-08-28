# BrainXchange Integration for Brainbridge

## Setup

Add this to your brainbridge startup process:

```typescript
// In your main server startup file
import { brainXchangeIntegration } from './integrations/brainxchange-integration';

async function startBrainbridge() {
  console.log('🧠 Starting Brainbridge...');
  
  // ... existing brainbridge initialization
  
  // Initialize BrainXchange integration
  try {
    const userEmail = process.env.BRAINXCHANGE_EMAIL || 'user@example.com';
    const userName = process.env.BRAINXCHANGE_NAME || 'User';
    
    await brainXchangeIntegration.initialize(userEmail, userName);
  } catch (error) {
    console.error('⚠️ BrainXchange integration failed:', error.message);
    console.log('Continuing without BrainXchange support...');
  }
  
  console.log('✅ Brainbridge ready');
}
```

## Command Integration

Add this to your command processing pipeline:

```typescript
// In your command handler
async function processUserInput(input: string): Promise<string> {
  // Check if it's a BrainXchange command first
  const brainXchangeResponse = await brainXchangeIntegration.handleCommand(input);
  if (brainXchangeResponse) {
    return brainXchangeResponse;
  }
  
  // ... existing brainbridge command processing
  
  // If no other commands match, return help or default response
  return "I didn't understand that command.";
}
```

## Environment Variables

Add to your `.env` file:

```env
# BrainXchange Configuration
BRAINXCHANGE_EMAIL=your@email.com
BRAINXCHANGE_NAME=Your Name
BRAINXCHANGE_SERVER=ws://m3u.dossant.com:8082
```

## Supported Commands

The integration supports these magi commands:

**Connection Management:**
- `magi create invite` - Generate invitation code for friends
- `magi connect ABC123` - Connect using invitation code
- `magi status` - Check connection status and connected friends
- `magi friends` - List all connected friends

**Communication:**
- `magi ask friend@email.com what's your favorite food?` - Ask connected friend directly
- `magi ask @alice about her expertise` - User discovery with connection guidance
- `magi ask anyone about react patterns` - Ask any connected friend

**User Discovery Flow:**
1. `magi ask @username about something` - System searches for @username
2. If not found: Shows connection options and saves your question
3. Use `magi connect ABC123` when you get their invitation code
4. Ask them directly once connected

## Usage Examples

Once integrated, users can:

```
User: "magi create invite"
Bot: "🎟️ Share this code: ABC123 (expires in 30 minutes)"

User: "magi connect XYZ789"  
Bot: "✅ Connected to Zack Chen!"

User: "magi ask zack.sushi@gmail.com what's your favorite sushi?"
Bot: "📤 Question sent to zack.sushi@gmail.com"
[Later] "💬 Answer from Zack Chen: My favorite is salmon nigiri!"

User: "magi ask @alice about her shrinking expertise"
Bot: "🔍 Looking for @alice on BrainXchange...
❌ User @alice not found in your connected friends.
Options to connect with @alice:
1. If you have an invitation code from @alice: magi connect ABC123
2. Create an invitation for @alice: magi create invite"

User: "magi friends"
Bot: "👥 Connected friends: • Zack Chen (zack.sushi@gmail.com)"
```

## Automatic Knowledge Sharing

The integration automatically:

1. **Answers incoming questions** by searching brainbridge memories
2. **Formats responses** naturally based on search results
3. **Handles errors gracefully** if knowledge search fails
4. **Logs all interactions** for debugging

## Development/Testing

### Quick Tests

Test the @alice command functionality directly:

```bash
# Test the integration without MCP server
node test-alice-simple.js

# Demo the complete user discovery flow  
node demo-alice-discovery.js
```

### Full Integration Testing

For local development with live server:

```bash
# Terminal 1: Start brainbridge with BrainXchange integration
cd brainbridge
BRAINXCHANGE_EMAIL=test@example.com BRAINXCHANGE_NAME="Test User" npm run dev:stdio

# You should see:
# 🔗 Connecting to BrainXchange network...
# ✅ Connected to BrainXchange Server  
# 🧠 Connected to BrainXchange as Test User (test@example.com)
# ✅ BrainXchange integration ready
```

### Test Files Available

- `test-alice-simple.js` - Direct integration test without server  
- `demo-alice-discovery.js` - Complete user discovery demo
- `test-alice-command.js` - MCP JSON-RPC command test

The integration automatically connects to the BrainXchange server at `ws://m3u.dossant.com:8082` during startup.