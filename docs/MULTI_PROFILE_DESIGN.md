# Multi-Profile AI System Design
## magi* - Manual Profile Selection for AGIfor.me

> **Multiple AI contexts - like having separate email accounts, each with smart internal organization**

## The Profile Concept

Your personal AI should have clear, intentional context boundaries just like you do with email accounts. You consciously choose your **work email** vs. **personal email** to prevent cross-contamination, but within each account you still have smart folders and organization.

**The magi* System**: Manual profile selection for explicit context separation:

```bash
magi     # Quick profile switcher / default profile selector
magic    # Personal/family profile (consciously chosen)
magik    # Business/professional profile (consciously chosen)  
magia    # Development/experimental profile (consciously chosen)
mago     # Custom user-defined profiles
```

## Why Multi-Profile Architecture?

### Intentional Context Separation (Like Email Accounts)
- **Conscious choice** prevents accidental cross-contamination
- **Business profile**: You would never accidentally enter personal information
- **Personal profile**: You would never accidentally enter work-sensitive information  
- **Dev profile**: Experimental work stays isolated from production contexts

### Extra Security Layer Through Manual Selection
- **User explicitly chooses** which context they're operating in
- **Mental mode switching** - like opening your work email vs. personal email
- **No automatic guessing** - you decide the appropriate context
- **Fail-safe boundaries** - impossible to accidentally mix contexts

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

## Command Interface Design

### Manual Profile Selection (`magi` as Switcher)
```bash
# magi as profile switcher - user makes conscious choice
magi use magic               # Switch to personal profile
magi use magik               # Switch to business profile
magi use magia               # Switch to development profile

# Or direct profile commands (explicit choice)
magic query "plan family vacation"          # Consciously using personal
magik query "quarterly revenue analysis"    # Consciously using business  
magia query "test new embedding model"      # Consciously using development

# Current profile status
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

### Daily Usage Patterns (Manual Context Switching)
```bash
# Morning: Consciously switch to business mode
magi use magik
magik query "what should I prioritize today based on recent team discussions?"

# Lunch break: Consciously switch to personal mode  
magi use magic
magic query "what's a good restaurant near the office that Sarah would like?"

# Evening: Already in personal mode, continue
magic write "plan weekend activities based on weather and kids' interests"

# Late night: Consciously switch to development mode
magi use magia
magia query "what experimental AI features should I test next?"
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

## Conclusion: Manual Context AI Like Email Accounts

The magi* multi-profile system transforms your personal AI from a single tool into multiple consciously-chosen contexts, each with smart internal organization.

**Key Benefits**:
- ✅ **Intentional context separation** - Like work vs. personal email accounts
- ✅ **Impossible cross-contamination** - Business profile cannot access personal memories
- ✅ **Conscious choice** - User explicitly selects appropriate context
- ✅ **Smart organization within profiles** - AGIfor.me's privacy system works inside each profile
- ✅ **Mental model alignment** - User always knows which "account" they're using

**The Two-Layer System**:
1. **Manual Profile Selection** (like choosing email account) - `magic`, `magik`, `magia`
2. **Automatic Smart Categorization** (like email folders) - `public/`, `team/`, `personal/`, `private/`, `sensitive/`

This isn't just about organizing commands - it's about creating AI contexts that match how you naturally separate different aspects of your life, while maintaining smart organization within each context.

*Your AI should have the same intentional boundaries you do.*