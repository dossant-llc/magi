# Persona-Specific Commands Roadmap

## Future Implementation: REPL Persona Commands

These persona-specific commands are planned for future implementation in the MAGI REPL system. Currently, persona switching is disabled in v0.1.1-rc1, but these commands represent the vision for personalized AI interactions.

### 🧠 Personal Persona Commands
- `journal` - Add entry to personal journal
- `goals` - Manage personal goals and aspirations
- `habits` - Track and analyze habits
- `mood` - Log current mood and emotions
- `reflect` - Guided self-reflection
- `gratitude` - Practice gratitude journaling
- `dreams` - Log and analyze dreams

### 💼 Work Persona Commands
- `standup` - Quick daily standup summary
- `todo` - Manage work tasks and priorities
- `delegate` - Track delegated tasks
- `review` - Performance and project reviews
- `metrics` - Work productivity metrics

### 👨‍💻 Dev Persona Commands
- `debug` - Help debug technical issues
- `docs` - Search technical documentation
- `pattern` - Identify code patterns and solutions
- `deploy` - Deployment guidance and checklists
- `test` - Testing strategies and templates

### 🎨 Creative Persona Commands
- `brainstorm` - Creative ideation session
- `inspire` - Get creative inspiration
- `draft` - Start creative drafts
- `remix` - Remix and iterate on ideas
- `explore` - Explore creative possibilities

### 👨‍👩‍👧‍👦 Family Persona Commands
- Family-specific commands to be defined

### 🔬 Research Persona Commands
- Research-specific commands to be defined

## Implementation Notes

- These commands will be context-aware based on the active persona
- Each command will have access to persona-specific memory scopes
- Commands will integrate with the MCP memory system for persistent storage
- Implementation planned for v0.1.2+ when persona switching is re-enabled

## Status

**Current:** Persona switching disabled, commands stubbed in REPL code
**Target:** Full persona-aware command system with memory integration
**Priority:** Medium - depends on persona system restoration