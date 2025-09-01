# Wake Word Configuration Guide

## Understanding the Wake Word System

### Architecture Flow:
```
User Input → Claude (AI) → MCP Tool Call → BrainBridge → Local LLM
```

**Who decides what:**
1. **User** - Types the wake word
2. **Claude AI** - Recognizes pattern and calls appropriate tool  
3. **BrainBridge** - Executes the tool
4. **Local LLM** - Does the actual processing

## Changing Wake Words

### Method 1: System Instructions (Recommended - Easy)
Change in Claude Code settings:

```
// OLD
"magi save [content]" → Use ai_save_memory

// NEW - Any wake word you want!
"brain remember [content]" → Use ai_save_memory  
"hey assistant save [content]" → Use ai_save_memory
"personal ai save [content]" → Use ai_save_memory
"igor save [content]" → Use ai_save_memory
```

### Method 2: Update Codebase (Advanced)
Edit `brainbridge/src/server.ts`:

```typescript
// Line 149 - Change this:
description: 'WAKE WORD: "magi save [content]" - Save content...',

// To this (example):
description: 'WAKE WORD: "brain remember [content]" - Save content...',
```

### Method 3: Multiple Wake Words (Most Flexible)
System instructions can support multiple patterns:

```
Personal AI Wake Words:
- "magi [command]" - Primary wake word
- "brain [command]" - Alternative  
- "igor [command]" - Personal name-based
- "remember [content]" - Natural language

Commands:
- save/remember → ai_save_memory
- tell me about/what about/find → ai_query_memories  
- status/health → ai_status
```

## Wake Word Design Philosophy

### Current Design (Multi-Context):
```
magi  = Personal context, local AI
magic = Family context, cloud AI (future)  
magik = Business context, local-only (future)
magia = Dev context, experimental (future)
```

### Simple Design (Single Wake Word):
```
brain = All personal AI functionality
hey [name] = Personalized wake word
assistant = Natural language wake word
```

## Examples of Different Wake Word Styles

### 1. Technical Style:
```
"system save [content]"
"query memories about [topic]"  
"check ai status"
```

### 2. Natural Style:
```
"remember this: [content]"
"what do I know about [topic]?"
"how's my AI doing?"
```

### 3. Personal Style:
```
"igor save [content]"        # Your name
"my brain tell me about [topic]"
"personal ai status"
```

### 4. Minimal Style:
```
"save [content]"             # Simple, but might conflict  
"find [topic]"               # Natural but generic
"status"                     # Very short
```

## Implementation Steps

### To Change Wake Words:

1. **Choose your style** (see examples above)

2. **Update system instructions** in Claude Code:
   ```
   Wake Word: "[your-choice]"
   - "[your-choice] save [content]" → ai_save_memory
   - "[your-choice] tell me about [topic]" → ai_query_memories
   - "[your-choice] status" → ai_status
   ```

3. **Optional: Update tool descriptions** in codebase:
   ```bash
   # Edit the files
   nano brainbridge/src/server.ts
   
   # Change lines 149, 173, 198 wake word descriptions
   # Then rebuild
   npm run build
   ```

4. **Restart BrainBridge** if you changed codebase:
   ```bash
   # Kill old server, start new one
   npm run start:stdio
   ```

## Testing Your Wake Words

```bash
# Test via command line first
npx tsx src/magic/index.ts save "test content"

# Then test via Claude Code
"[your-wake-word] save this is a test"
```

## Recommended Wake Words

**Best Options:**
- `brain` - Short, clear, personal
- `assistant` - Natural, conversational  
- `[your-name]` - Personal, unique
- `magi` - Current default, magical theme

**Avoid:**
- Common words that might trigger accidentally
- Very long phrases  
- Words that conflict with normal conversation

The wake word is just a **pattern matching hint** for Claude - you have complete control over it! 🎛️