import { brainXchange } from '../services/brainxchange';
import { MemoryService } from '../services/memory-service';

/**
 * BrainXchange Integration for Brainbridge
 * Enables "magi ask [friend] [question]" commands
 */

export class BrainXchangeIntegration {
  private isInitialized = false;
  private userEmail: string = '';
  private userName: string = '';
  private memoryService: MemoryService | null = null;

  async initialize(userEmail: string, userName: string, memoryService?: MemoryService) {
    if (this.isInitialized) return;

    this.userEmail = userEmail;
    this.userName = userName;
    this.memoryService = memoryService || null;

    // Only try to connect if BrainXchange is explicitly enabled
    if (process.env.ENABLE_BRAINXCHANGE === 'true' || process.env.DEBUG_BRAINXCHANGE) {
      try {
        // Connect to BrainXchange network
        console.log('🔗 Connecting to BrainXchange network...');
        await brainXchange.connect();
        
        // Identify ourselves
        await brainXchange.identify(userEmail, userName);
        console.log(`🧠 Connected to BrainXchange as ${userName} (${userEmail})`);

        // Set up message handlers
        this.setupMessageHandlers();
        
        this.isInitialized = true;
        console.log('✅ BrainXchange integration ready');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (process.env.DEBUG_BRAINXCHANGE) {
          console.error('❌ Failed to initialize BrainXchange:', errorMessage);
        }
        console.log('🔄 BrainXchange disabled - set ENABLE_BRAINXCHANGE=true to enable');
        // Don't throw - allow the service to continue without BrainXchange
        this.isInitialized = false;
      }
    } else {
      // BrainXchange disabled by default
      if (process.env.DEBUG_BRAINXCHANGE) {
        console.log('🔗 BrainXchange disabled - set ENABLE_BRAINXCHANGE=true to enable');
      }
      this.isInitialized = false;
    }
  }

  private setupMessageHandlers() {
    // Handle incoming questions from friends
    brainXchange.onQuestion(async (content, from, fromNickname) => {
      console.log(`❓ Question from ${fromNickname} (${from}): "${content}"`);
      
      try {
        // Search our knowledge base
        let answer = 'I don\'t have information about that.';
        
        if (this.memoryService) {
          const searchResults = this.memoryService.searchMemories(content);
          if (searchResults && searchResults.length > 0) {
            // Use the most relevant result
            answer = this.formatSearchResult(searchResults[0], content);
          }
        }
        
        // Send answer back
        await brainXchange.answer(answer, from);
        console.log(`💬 Answered ${fromNickname}: "${answer.substring(0, 50)}..."`);
        
      } catch (error) {
        console.error('Error answering question:', error);
        await brainXchange.answer('Sorry, I encountered an error searching my knowledge.', from);
      }
    });

    // Handle incoming answers from friends
    brainXchange.onAnswer((content, from, fromNickname) => {
      console.log(`💬 Answer from ${fromNickname}: "${content}"`);
      // This will be displayed to the user automatically
    });

    // Handle friend connections/disconnections
    brainXchange.onFriendConnected((friend) => {
      if (friend) {
        console.log(`👋 ${friend.nickname} connected to BrainXchange`);
      }
    });

    brainXchange.onFriendDisconnected((friend) => {
      if (friend) {
        console.log(`👋 ${friend.nickname} disconnected from BrainXchange`);
      }
    });
  }

  private formatSearchResult(result: any, originalQuestion: string): string {
    // Format the search result into a natural answer
    if (result.content) {
      // If it's a direct match, return the content
      return result.content;
    }
    
    // If we have metadata, format it nicely
    if (result.title && result.summary) {
      return `Based on "${result.title}": ${result.summary}`;
    }
    
    return 'I found some relevant information but couldn\'t format a clear answer.';
  }

  /**
   * Handle BrainXchange commands from user input
   */
  async handleCommand(input: string): Promise<string | null> {
    if (!this.isInitialized) {
      return 'BrainXchange is not initialized. Please check your connection.';
    }

    const command = input.toLowerCase().trim();

    // Create invitation
    if (command === 'magi create invite' || command === 'brainx create invite') {
      try {
        const invite = await brainXchange.createInvite();
        return `🎟️ Share this code with your friend: **${invite.code}**

From: ${invite.from}
Expires: ${invite.expiresIn}

They can connect by saying: "magi connect ${invite.code}"`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ Failed to create invitation: ${errorMessage}`;
      }
    }

    // Connect with invitation code
    if (command.startsWith('magi connect ') || command.startsWith('brainx connect ')) {
      const code = command.split(' ')[2];
      if (!code) {
        return '❌ Please provide an invitation code: "magi connect ABC123"';
      }

      try {
        const connection = await brainXchange.connectWithCode(code);
        return `✅ Connected to ${connection.friend?.nickname || 'friend'}!

You can now ask them questions:
"magi ask ${connection.friend?.username} what's your favorite food?"`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ Failed to connect: ${errorMessage}`;
      }
    }

    // Ask a friend a question
    if (command.startsWith('magi ask ') || command.startsWith('brainx ask ')) {
      const askCommand = input.substring(input.indexOf('ask ') + 4);
      const match = askCommand.match(/^(\S+)\s+(.+)$/);
      
      if (!match) {
        return '❌ Usage: "magi ask friend@email.com what is your favorite flavor?" or "magi ask @alice about her expertise"';
      }

      const [, target, question] = match;

      // Handle @username syntax for user discovery
      if (target.startsWith('@')) {
        const username = target.substring(1); // Remove @ symbol
        return await this.handleUserDiscovery(username, question);
      }

      // Regular friend targeting (existing connected friends)
      try {
        await brainXchange.ask(question, target);
        return `📤 Question sent to ${target}: "${question}"
        
Waiting for response...`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ Failed to send question: ${errorMessage}`;
      }
    }

    // List connected friends
    if (command === 'magi friends' || command === 'brainx friends') {
      const friends = brainXchange.getConnectedFriends();
      if (friends.length === 0) {
        return '👥 No friends connected. Create an invitation to connect with friends.';
      }

      const friendList = friends
        .map(f => `• ${f.nickname} (${f.username})`)
        .join('\n');
      
      return `👥 Connected friends:\n${friendList}`;
    }

    // Status check
    if (command === 'magi status' || command === 'brainx status') {
      const currentUser = brainXchange.getCurrentUser();
      const friends = brainXchange.getConnectedFriends();
      
      return `🧠 BrainXchange Status:
• Connected as: ${currentUser.nickname} (${currentUser.username})
• Friends online: ${friends.length}
• Server: ${brainXchange.connected ? '✅ Connected' : '❌ Disconnected'}`;
    }

    return null as string | null; // Not a BrainXchange command
  }

  /**
   * Handle user discovery for @username syntax
   */
  private async handleUserDiscovery(username: string, question: string): Promise<string> {
    // Check if user is already connected
    const connectedFriends = brainXchange.getConnectedFriends();
    const existingFriend = connectedFriends.find(f => 
      f.username.includes(username) || f.nickname.toLowerCase().includes(username.toLowerCase())
    );

    if (existingFriend) {
      // User is already connected, ask them directly
      try {
        await brainXchange.ask(question, existingFriend.username);
        return `📤 Question sent to ${existingFriend.nickname} (@${username}): "${question}"
        
Waiting for response...`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ Failed to send question to @${username}: ${errorMessage}`;
      }
    }

    // User not found in connected friends - need to discover and connect
    return `🔍 **Looking for @${username} on BrainXchange...**

❌ **User @${username} not found in your connected friends.**

**Options to connect with @${username}:**

1. **If you have an invitation code** from @${username}:
   \`magi connect ABC123\`

2. **Create an invitation** for @${username} to use:
   \`magi create invite\`

3. **Current connected friends:**
${connectedFriends.length > 0 
  ? connectedFriends.map(f => `   • ${f.nickname} (${f.username})`).join('\n')
  : '   No friends connected yet'
}

**Your pending question:** "${question}"
*Save this question and try connecting with @${username} first!*`;
  }

  /**
   * Get help text for BrainXchange commands
   */
  getHelpText(): string {
    return `🧠 **BrainXchange Commands:**

**Connection:**
• \`magi create invite\` - Create invitation code for friends
• \`magi connect ABC123\` - Connect using friend's invitation code
• \`magi friends\` - List connected friends
• \`magi status\` - Check connection status

**Communication:**
• \`magi ask friend@email.com what's your favorite food?\` - Ask specific friend
• \`magi ask @alice about her expertise\` - Find and ask user @alice
• \`magi ask anyone about react patterns\` - Ask any connected friend

**Examples:**
• \`magi ask knor@test.com what is your favorite flavor?\`
• \`magi ask @alice about her shrinking expertise\`
• \`magi ask zack.sushi@gmail.com what's the best sushi place?\``;
  }
}

// Singleton instance
export const brainXchangeIntegration = new BrainXchangeIntegration();