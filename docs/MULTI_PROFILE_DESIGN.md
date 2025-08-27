# Multi-Profile AI System Design
## magi* - Wake Word System for Personal AI Activation

> **`magi` activates your personal AI knowledge system - like wake words for voice assistants**

## The Wake Word Concept

Just like "Hey Siri" or "Alexa" signals you want voice AI assistance, **`magi`** signals you want to access your personal AI knowledge base through MCP. Without the wake word, Claude gives generic responses. With it, Claude accesses your contextual memories and provides personalized assistance.

**The magi* Wake Word System**:

```bash
# Wake word activations (triggers MCP)
magi [query]    # Smart context + local environment (default)
magic [query]   # Personal context + cloud environment
magik [query]   # Business context + local environment  
magia [query]   # Development context + local environment
magid [query]   # Smart context + development environment
magico [query]  # Personal context + omni (auto environment selection)
```

**Environment Suffixes**:
- **i** = local (intelligent/internal) - stays on your machine
- **c** = cloud - can access cloud AI services with consent
- **k** = local (keep private) - business context, local only
- **a** = local (autonomous) - dev context, experimental features
- **d** = development environment - dev tools and experimental access
- **o** = omni (auto) - smart environment selection based on context

**Examples**:
```bash
# Generic Claude (no MCP access)
"Help me plan a vacation to Italy"
→ Generic travel advice

# Personal AI activated (local environment)
"magi help me plan a vacation to Italy" 
→ Local AI + smart context detection
→ Accesses your travel memories, family preferences, past trips

# Personal context with cloud access
"magic help me plan a vacation to Italy"
→ Cloud AI + personal context + consent for external services
→ Can book flights, check real-time prices with your preferences

# Business context, local only
"magik analyze our Q4 performance trends"
→ Local AI only + business context (privacy-first for sensitive data)
→ Accesses work memories without any cloud exposure
```

## Why Wake Word + Context System?

### MCP Activation Control
- **Explicit intent**: Only accesses your personal knowledge when `magi*` is used
- **Privacy by default**: Generic Claude responses unless explicitly activated
- **Clear boundaries**: You control when AI gets personal context vs. generic help
- **Familiar pattern**: Like voice assistant wake words everyone understands

### Context + Environment Matrix
- **magi**: Smart context + local environment (default safe mode)
- **magic**: Personal context + cloud environment (with consent)
- **magik**: Business context + local only (maximum privacy)
- **magia**: Dev context + local with experimental features
- **magid**: Smart context + development environment 
- **magico**: Personal context + omni (auto environment selection)

### Security Through Explicit Activation
- **No accidental access**: Your memories stay private unless wake word is used
- **Intentional engagement**: You consciously choose when to get personal AI help
- **Context boundaries**: Business context can't access personal memories and vice versa

### Behavioral Adaptation Per Profile
- **Business profile**: Professional tone, formal writing, industry terminology
- **Personal profile**: Casual tone, family context, personal preferences
- **Dev profile**: Technical focus, experimental features enabled

### Smart Organization Within Each Profile
- **Inside each profile**: AGIfor.me's existing smart categorization still works
- **public/**, **team/**, **personal/**, **private/**, **sensitive/** folders per profile
- **Automatic privacy classification** within the chosen context

## Profile Architecture

### Profile Structure (Like Email Accounts)
```
magic (Personal Profile - Consciously Chosen):
├── magic-memories/
│   ├── public/           # Shareable personal insights
│   ├── personal/         # Family, friends, hobbies  
│   ├── private/          # Personal thoughts, goals
│   ├── sensitive/        # Personal sensitive info
│   └── examples/         # Personal templates
└── .magic-index/         # Personal profile vector index

magik (Business Profile - Consciously Chosen):
├── magik-memories/
│   ├── public/           # Shareable business insights
│   ├── team/             # Work colleagues, processes
│   ├── private/          # Business strategies, ideas
│   ├── sensitive/        # Business sensitive info
│   └── examples/         # Business templates
└── .magik-index/         # Business profile vector index

magia (Development Profile - Consciously Chosen):
├── magia-memories/
│   ├── public/           # Shareable dev insights
│   ├── experimental/     # New features, tests
│   ├── private/          # Dev ideas, architecture
│   ├── sensitive/        # Security, credentials info
│   └── examples/         # Dev templates
└── .magia-index/         # Development profile vector index
```

### Cross-Profile Isolation
- **Complete separation**: Each profile has its own memory storage
- **No accidental access**: Business profile cannot see personal memories
- **Manual context switching**: User explicitly chooses which "account" to use
- **Within-profile organization**: Smart categorization happens inside each profile

### Profile-Specific Configurations
```typescript
interface ProfileConfig {
  name: string;
  description: string;
  
  // Memory access
  allowedMemoryLevels: MemoryLevel[];
  requiresConsentFor: MemoryLevel[];
  deniedMemoryLevels: MemoryLevel[];
  
  // AI behavior
  systemPrompt: string;
  tone: 'professional' | 'casual' | 'technical' | 'creative';
  writingStyle: string;
  
  // Technical config
  chatModel: string;        // e.g. 'llama3.1:8b'
  embeddingModel: string;   // e.g. 'mxbai-embed-large'
  indexPath: string;        // e.g. '.index-business/'
  
  // Features
  experimentalFeatures: boolean;
  autoConsolidation: boolean;
  memoryWriteEnabled: boolean;
}
```

## Wake Word Interface Design

### Direct Wake Word Usage (Primary UX)
```bash
# Wake word queries (what users actually type)
magi "plan family vacation"              # Smart context detection
magic "plan family vacation"             # Explicit personal context
magik "quarterly revenue analysis"       # Explicit business context  
magia "test new embedding model"         # Explicit dev context

# The MCP Integration
# Claude recognizes these wake words and calls MCP tools:
# - search_memories with appropriate context filters
# - add_memory with appropriate privacy classification
# - Uses context-specific AI behavior (tone, focus, etc.)
```

### Profile Management (Secondary UX)
```bash
# Profile switching for persistent sessions
magi use magic               # Switch default context to personal
magi use magik               # Switch default context to business
magi use magia               # Switch default context to development

# Profile status and management
magi status                  # Shows current active profile
magi profiles                # Lists available profiles
```

### Explicit Profile Commands
```bash
# Personal context
magic query "what restaurants does Sarah like?"
magic write "weekend activity ideas based on family preferences"

# Business context  
magik query "client objection handling strategies"
magik write "Q4 performance summary from team learnings"

# Development context
magia query "experimental features to test next"
magia consolidate --experimental-algorithms
```

### Profile Management
```bash
# Profile operations
magi profiles list                    # Show all available profiles
magi profiles create custom-profile   # Create new custom profile
magi profiles set-default magic       # Set default profile for magi
magi profiles config magik             # Edit business profile settings

# Context switching
magi use magic                        # Switch default context
magi status                          # Show current profile + health
```

## Implementation Architecture

### File Structure
```
brainbridge/
├── src/
│   ├── profiles/
│   │   ├── manager.ts           # Profile management
│   │   ├── configs/
│   │   │   ├── personal.ts      # magic profile config
│   │   │   ├── business.ts      # magik profile config  
│   │   │   ├── development.ts   # magia profile config
│   │   │   └── default.ts       # Base profile template
│   │   └── selector.ts          # Smart profile selection
│   └── magic/                   # Existing local AI engine
memories/                        # Existing memory categories
├── .index-personal/             # magic profile index
├── .index-business/             # magik profile index
├── .index-development/          # magia profile index
└── .profiles/
    ├── active-profile.json      # Current magi selection
    ├── custom-profiles.json     # User-defined profiles
    └── usage-stats.json         # Profile usage analytics
```

### Manual Profile Selection Logic
```typescript
class ProfileManager {
  private currentProfile: ProfileType = 'magic'; // default
  
  // User explicitly switches profiles
  switchProfile(profile: ProfileType): void {
    this.currentProfile = profile;
    console.log(`Switched to ${profile} profile`);
    this.updatePrompt(); // Update CLI prompt to show current profile
  }
  
  // Get current profile for command execution
  getCurrentProfile(): ProfileConfig {
    return this.profiles[this.currentProfile];
  }
  
  // Safety check - confirm profile for sensitive operations
  async confirmProfile(operation: string): Promise<boolean> {
    const confirm = await promptUser(
      `You're about to ${operation} in your ${this.currentProfile} profile. Continue?`
    );
    return confirm;
  }
  
  // Show profile status
  showStatus(): void {
    console.log(`Current profile: ${this.currentProfile}`);
    console.log(`Memory location: ${this.getCurrentProfile().memoryPath}`);
    console.log(`AI behavior: ${this.getCurrentProfile().tone}`);
  }
}
```

## Profile-Specific Behaviors

### magic (Personal Profile)
```yaml
systemPrompt: |
  You are Igor's personal AI assistant. You have access to his family context, 
  personal preferences, and private thoughts. Use a casual, friendly tone.
  When discussing family activities, reference past preferences and experiences.

tone: casual
writingStyle: "Conversational, with personal touches and family context"
features:
  - Family calendar integration
  - Personal preference learning
  - Casual writing style
  - Weekend/hobby planning focus
```

### magik (Business Profile)  
```yaml
systemPrompt: |
  You are Igor's professional business assistant. Focus on strategic thinking,
  team collaboration, and business outcomes. Use professional language and
  industry best practices.

tone: professional  
writingStyle: "Clear, strategic, business-focused with data-driven insights"
features:
  - Revenue/strategy analysis
  - Team collaboration patterns
  - Professional writing style
  - Meeting preparation assistance
```

### magia (Development Profile)
```yaml
systemPrompt: |
  You are Igor's development and experimentation assistant. You can access 
  experimental features and help with technical exploration. Be precise but
  encouraging about trying new approaches.

tone: technical
writingStyle: "Precise, experimental, with technical depth and curiosity"  
features:
  - Experimental feature access
  - Technical debugging assistance
  - Code and architecture analysis
  - Research and learning support
```

## User Experience Design

### Onboarding Flow
```bash
# First-time setup
magi setup
# → Creates default profiles (magic, magik, magia)
# → Asks user to customize access patterns
# → Builds initial indexes for each profile

# Profile customization
magi profiles setup magic
# → Guides user through personal context setup
# → Defines memory access preferences  
# → Sets behavioral parameters
```

### Daily Usage Patterns (Context + Environment)
```bash
# Morning: Business context (privacy-first, local only)
magik "what should I prioritize today based on recent team discussions?"
# → Local AI + business context (sensitive work data stays local)

# Lunch break: Personal context with cloud services
magic "what's a good restaurant near the office that Sarah would like?"
# → Cloud AI + personal context (can check real-time reviews, availability)

# Evening: Smart context detection, local processing
magi "plan weekend activities based on weather and kids' interests"
# → Local AI + smart context (detects personal context automatically)

# Late night: Development environment with experimental features
magid "what experimental AI features should I test next?"
# → Dev environment + smart context (access to dev tools and experimental features)

# Work-from-home: Auto environment selection
magico "help me balance work calls with kids' school pickup"
# → Omni mode automatically balances local privacy with cloud convenience
```

### Profile Switching (Always Manual for Security)
```bash
# Manual switching with confirmation for sensitive contexts
magi use magik --confirm
# → "Switching to business profile. Personal memories will be inaccessible. Continue? [y/N]"

# Quick status check
magi status
# → "Current: magik (business) | Memory: /magik-memories/ | Tone: Professional"

# Profile-specific CLI prompts for awareness
magic@personal:~$ query "weekend plans"     # Clear visual indicator
magik@business:~$ query "quarterly goals"   # User always knows context
magia@dev:~$ query "experimental features"  # No accidental mixing
```

## Privacy & Security Considerations

### Complete Profile Isolation (Like Separate Email Accounts)
- **Physical separation**: Each profile has its own memory directory
- **Index isolation**: Separate vector indexes with no cross-access
- **Zero cross-contamination**: Business profile literally cannot see personal memories
- **Audit separation**: Each profile maintains its own access logs

### Security Through Manual Selection
- **Conscious choice**: User explicitly chooses context (like opening work vs. personal email)
- **No automatic guessing**: System never assumes context from query content
- **Mental model alignment**: User knows exactly which "account" they're using
- **Impossible accidents**: Can't accidentally mix business and personal

### Within-Profile Smart Organization
```bash
# User chooses profile (manual step)
magi use magic

# Within personal profile, AI automatically categorizes (smart step)
magic add "Remember Sarah loves Thai food"
# → AI automatically puts in magic-memories/personal/ folder

# Within business profile, AI automatically categorizes (smart step)  
magik add "Q4 strategy focuses on enterprise clients"
# → AI automatically puts in magik-memories/team/ folder
```

### Fail-Safe Mechanisms
```bash
# Clear profile awareness at all times
magic@personal:~$ query "client revenue data"
# → Warning: "You're in PERSONAL profile. Business data not accessible."
# → "Switch to business profile? [y/N]"

# Confirmation for profile switches
magi use magik --from-personal
# → "Switching from PERSONAL to BUSINESS profile."
# → "Personal memories will become inaccessible. Continue? [y/N]"
```

## Implementation Timeline

### Phase 1: Core Multi-Profile System (2 weeks)
- [ ] Profile manager and configuration system
- [ ] Basic magic/magik/magia profile implementations  
- [ ] Complete profile isolation (separate memory directories)
- [ ] Manual profile switching with confirmation prompts

### Phase 2: Profile Management UX (1 week)  
- [ ] Profile-aware CLI prompts (`magic@personal:~$`)
- [ ] `magi status` and `magi profiles` commands
- [ ] Profile switching confirmation and warnings
- [ ] Clear visual indicators of current profile

### Phase 3: Advanced Features (2 weeks)
- [ ] Custom profile creation and management
- [ ] Profile-specific AI behavior configuration
- [ ] Usage analytics and learning
- [ ] Advanced context switching (time/location-based)

## Success Metrics

### User Experience
- [ ] Users naturally adopt different profiles for different contexts
- [ ] <5% cross-context privacy violations (e.g., business AI accessing personal memories)
- [ ] 90%+ accuracy in smart profile selection
- [ ] Users report feeling more confident about AI privacy

### Technical Performance  
- [ ] Profile switching takes <2 seconds
- [ ] Memory isolation is 100% effective
- [ ] Each profile maintains separate, clean indexes
- [ ] No performance degradation with multiple profiles

### Adoption Patterns
- [ ] Users create at least 1 custom profile within 30 days
- [ ] 70%+ of queries use appropriate context profile
- [ ] Users report better AI responses due to context awareness

---

## Conclusion: Wake Word Activation for Personal AI

The magi* wake word system transforms Claude from generic assistant to your personal AI through explicit MCP activation. Like voice assistant wake words, it provides clear intent signaling and context-aware responses.

**Key Benefits**:
- ✅ **Privacy by default** - Your memories stay private unless explicitly activated
- ✅ **Familiar UX pattern** - Wake words like voice assistants everyone understands  
- ✅ **Context-aware responses** - Business, personal, and dev contexts with appropriate tone
- ✅ **Explicit intent** - Clear signal when you want personal AI vs. generic help
- ✅ **MCP integration** - Seamless activation of your knowledge base through recognized patterns

**The Wake Word System**:
1. **No wake word** → Generic Claude responses (no MCP access)
2. **magi/magic/magik/magia** → Personal AI activated with appropriate context
3. **Smart MCP integration** → Accesses your memories, applies context-specific behavior

**How It Works**:
```
User: "magi help me plan my vacation"
Claude: [recognizes wake word] → [calls MCP search_memories] → [personalized response]

User: "help me plan my vacation" 
Claude: [no wake word] → [generic travel advice]
```

This isn't just about organizing memories - it's about giving Claude the ability to recognize when you want personal AI assistance and respond with your contextual knowledge and preferences.

*Your personal AI should activate when you need it, stay private when you don't.*

---

## A Nostalgic Note: AI "Drive Letters"

The magi* suffix system is inspired by the classic DOS/Windows drive letter concept that defined computing for decades:

```bash
# The good old days
C:\> dir          # Local hard drive
A:\> dir          # Floppy disk
D:\> dir          # CD-ROM drive
```

```bash
# The AI era
magi> query       # Local smart context (your new C: drive)
magic> query      # Personal context + cloud drive  
magik> query      # Business context + local drive
magid> query      # Smart context + development drive
```

Just like drive letters told you **where** your files lived and **what** capabilities you had access to, magi* suffixes tell you **where** your AI processing happens and **what** context you're operating in.

The mental model is instantly familiar:
- You'd never put sensitive business files on a floppy disk (A:\)
- You'd never use `magic` (cloud) for sensitive business queries - you'd use `magik` (local only)
- `C:\>` was your reliable default drive
- `magi>` is your reliable default safe mode

Sometimes the best new interfaces are the ones that feel like home. 🏠💾