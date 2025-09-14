# Magi Hybrid Development Assistant

## Overview
Transform `npm run magi` into a hybrid development assistant that provides instant answers to dev questions while maintaining the existing AI memory system functionality.

## Problem
- Hard to remember all npm commands and their syntax
- Need quick system status without going through AI memory system
- Want natural language input but don't always need LLM processing
- Current `magi` is just a chat interface to BrainBridge

## Solution: Three-Tier Hybrid System

### Tier 1: Fast Pattern Matching (~1-10ms)
Instant responses for common dev questions using regex patterns:

```javascript
const patterns = [
  { regex: /is (.*) running/i, handler: checkProcess },
  { regex: /what.*port.*(\d+)/i, handler: checkPort },
  { regex: /what.*does.*npm run (.*)/i, handler: explainCommand },
  { regex: /status|health/i, handler: systemStatus },
  { regex: /show.*process/i, handler: listProcesses },
  { regex: /ports?/i, handler: showPorts },
  { regex: /kill.*(all|everything)/i, handler: killAll },
  { regex: /models?/i, handler: showModels },
];
```

### Tier 2: Local LLM Fallback (~1-3 seconds)
For complex troubleshooting questions that don't match patterns:
- Triggered by `ask:` prefix or when no pattern matches
- Uses local Ollama (llama3.1:8b) for intelligent responses
- Focused on development/system questions only

### Tier 3: BrainBridge Memory System (existing)
Normal AI memory queries for knowledge base:
- Default behavior for non-dev questions
- Maintains current functionality

## Implementation Flow

```javascript
async function handleInput(input) {
  // Tier 1: Try pattern matching first (instant)
  const quickAnswer = tryPatterns(input);
  if (quickAnswer) return quickAnswer;
  
  // Tier 2: LLM for complex dev questions
  if (input.startsWith('ask:') || isComplexDevQuestion(input)) {
    return await queryLocalLLM(input);
  }
  
  // Tier 3: BrainBridge memory system
  return await sendToBrainBridge(input);
}
```

## Example Interactions

```
🧙 Magi> is bc running?
[instant] ✅ BrainCloud running on port 8147 (PID: 12345)

🧙 Magi> what's npm run magic?
[instant] 📦 Runs brainbridge magic commands
         Actual: npm run magic --workspace=brainbridge

🧙 Magi> status
[instant] 🤖 Ollama: ✅ Running (2 models)
         🧠 BrainBridge: ✅ 1 process  
         📁 Memories: 42 indexed
         🔗 Ports: 8147, 11434

🧙 Magi> ask: what should I do if ollama stops responding?
[2s] 🤔 Based on common issues, try:
     1. Check if ollama process is running: ps aux | grep ollama
     2. Restart ollama service: ollama serve
     3. Check port 11434: lsof -i :11434
     4. Look at logs for error messages

🧙 Magi> tell me about react hooks
[normal] 🧠 Searching your memories...
         [BrainBridge AI response from knowledge base]
```

## Pattern Categories to Support

### System Status
- "is [service] running?"
- "status" / "health"
- "what's running?"
- "ports"

### Command Help
- "what does [command] do?"
- "explain npm run [script]"
- "help with [command]"

### Process Management  
- "show processes"
- "kill all"
- "stop [service]"

### Models/AI
- "models"
- "is ollama working?"
- "ai status"

### Quick Actions
- "restart [service]"
- "logs"
- "clear"

## Technical Implementation

### Files to Modify
1. `scripts/chat-simple.js` - Add hybrid routing logic
2. `scripts/dev-patterns.js` - New file for pattern definitions and handlers
3. `scripts/dev-handlers.js` - New file for system query functions

### Integration Points
- Reuse existing diagnostic functions from `scripts/diagnostics.js`
- Parse `package.json` for command explanations
- Use existing process checking utilities
- Maintain connection to BrainBridge for memory queries

## Benefits
- ✅ Natural language input for dev questions
- ⚡ Instant responses for common queries  
- 🧠 Intelligent fallback for complex questions
- 🔄 Maintains existing AI memory functionality
- 📚 Easy to extend with new patterns
- 🚀 Improves development workflow speed

## Next Steps
1. Implement pattern matching system
2. Create dev question handlers
3. Add LLM fallback logic
4. Test with common dev workflows
5. Add more patterns based on usage