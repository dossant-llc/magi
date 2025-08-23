# Knowledge Directory

This is where your personal knowledge lives! The MCP server reads from this directory to provide AI assistants with access to your accumulated knowledge.

## 🛡️ Privacy-First Organization

Your knowledge is organized by **privacy levels**, giving you complete control over what gets shared with whom:

```
knowledge/
├── public/          🌍 Shareable with anyone
├── team/           👥 Work colleagues only  
├── personal/       🏠 Close friends and family context
├── private/        🔒 Local AI assistants only
├── sensitive/      🚨 Maximum protection required
└── examples/       📚 Templates and guides
```

## Getting Started

1. **Read the privacy level guides** in each directory's README
2. **Start with the templates** - copy `getting-started-template.md` from any privacy level
3. **Choose your privacy level** based on who should have access
4. **Add knowledge** using the MCP server's `add_knowledge` tool or by editing files directly

## Privacy Level Quick Guide

| Level | Icon | Who Can Access | Consent Required | Examples |
|-------|------|---------------|------------------|----------|
| **Public** | 🌍 | Anyone | No | Blog-worthy tips, open source insights |  
| **Team** | 👥 | Work colleagues | Yes (cloud AIs) | Code review processes, team workflows |
| **Personal** | 🏠 | Trusted friends/family | Yes (cloud AIs) | Life lessons, decision frameworks |
| **Private** | 🔒 | Local AIs only | Yes (always) | Business strategies, client insights |
| **Sensitive** | 🚨 | Maximum protection | Yes (every access) | Security procedures, legal matters |

## Tips for Effective Knowledge Capture

### 1. **Be Specific**
❌ "Fixed the bug"  
✅ "Fixed authentication timeout by increasing JWT expiry from 15min to 1hr in config.js:42"

### 2. **Include Context** 
- What was the situation?
- Why did this approach work?
- What alternatives were considered?

### 3. **Add Searchable Keywords**
Include terms you'll likely search for later:
- Technology names
- Error messages  
- Symptom descriptions

### 4. **Date Your Entries**
Track when you learned something - context matters!

### 5. **Cross-Reference**
Link related knowledge together.

## File Naming

Use descriptive, searchable names:
- `network-troubleshooting.md` ✅
- `stuff.md` ❌
- `postgres-performance-tuning.md` ✅
- `notes.md` ❌

## Privacy Note

The `.gitignore` file excludes this directory (except examples) from git by default. Your personal knowledge stays private unless you explicitly choose to share specific files.

---

**Ready to start?** Copy a template from `examples/` and begin capturing your knowledge!