# AGIfor.me

> **Your Personal AI Memory Bank**

🔒 **PRIVATE DEVELOPMENT** - This repository is currently private for review and testing before public release.

**BrainBridge** • **BrainKeeper** • **Your Memories**

> **Transform your scattered lessons learned into an intelligent, privacy-aware memory bank**

**BrainBridge** connects your memories to AI assistants. **BrainKeeper** guards your privacy and provides insights. Your **memories** stay organized and secure.

## 🚀 Quick Start

```bash
git clone https://github.com/yourusername/agiforme
cd agiforme
npm install
./start.sh
```

## ✨ What it does

Transform scattered lessons learned into an intelligent, privacy-aware knowledge base:

- 🧠 **Smart categorization**: AI automatically organizes knowledge by privacy level
- 🔍 **Privacy-aware search**: Find information while respecting access controls
- 🛡️ **Consent system**: You control what each AI assistant can access
- 📚 **Natural capture**: Just add insights - no manual filing required

## 🛡️ Privacy-First Knowledge Organization

Your knowledge is automatically organized by privacy level:

```
memories/
├── public/          🌍 Anyone can access (blog-worthy insights)
├── team/           👥 Work colleagues only (processes, workflows)  
├── personal/       🏠 Close friends/family context (life lessons)
├── private/        🔒 Local AI assistants only (business strategies)
├── sensitive/      🚨 Maximum protection (security, legal)
└── examples/       📚 Templates and learning materials
```

**Smart capture**: Just add memories naturally - AI suggests the right privacy level!

## 🛠️ Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MCP-compatible AI assistant (like Claude Code)

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/agiforme
   cd agiforme
   npm install
   ```

2. **Set up your personal memories**
   ```bash
   ./setup.sh
   ```

3. **Start the server**
   ```bash
   ./start.sh
   ```

4. **Configure your AI assistant**
   - Add this MCP server to your AI assistant's configuration
   - The server runs on stdio by default (perfect for Claude Code)

### Usage Examples

**With Claude Code:**
```
You: "Search my knowledge for network troubleshooting"
Claude: [searches and finds your network debugging steps]

You: "Add this to my knowledge: Always check DNS first when debugging connectivity"  
Claude: [adds to your troubleshooting knowledge]
```

## 🔒 Privacy & Security

### Your Memories Stay Private
- 🛡️ **Git-ignored**: Your `memories/` folder is never committed to version control
- 🏠 **Local-first**: Everything runs on your machine by default
- 🔐 **Consent-driven**: You control what each AI assistant can access
- 🚫 **No accidental sharing**: Smart privacy classification prevents exposures

### Privacy Protection Like `.env` Files
Just like you'd never commit `.env` to git, your personal memories are automatically protected:
- ✅ `memories.sample/` - Template structure (ships with project)
- 🚫 `memories/` - Your actual memories (git-ignored, stays local)
- 🔧 `./setup.sh` - Creates your private memories from template

### On-Demand Access
- **Start only when needed**: No always-on services
- **Local AI assistants**: Direct, private communication
- **Cloud AI integration**: Optional, with explicit consent system

## 🌍 Deployment Options

### Local Only (Recommended)
Perfect for personal use with local AI tools:
```bash
./start.sh  # Runs on stdio for MCP
```

### Remote Access (Advanced)
For cloud AI integration:
1. Set up reverse proxy (nginx)
2. Configure DDNS (like AGIfor.me)
3. Add SSL certificate
4. Enable when needed for cloud AI access

## 📖 Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and technical details
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Development phases and future features  
- **[docs/PRIVACY_DESIGN.md](docs/PRIVACY_DESIGN.md)** - Detailed privacy and consent system design
- **[PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md)** - Review checklist before going public

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Feature ideas and bug reports  
- Code contributions and architecture improvements
- Smart categorization rule improvements
- Privacy UX enhancements

## 📄 License

**Dual Licensed** - Choose what works for you:

- 🏠 **Personal Use**: Free under AGPL v3 license
- 🏢 **Commercial Use**: Commercial license available for proprietary modifications

This ensures the project stays open source while protecting innovation. See [LICENSE](LICENSE) file for full details.

💼 **Commercial licensing inquiries welcome** - Contact maintainers for enterprise licensing options.

## 🎯 Inspiration

Born from the realization that we all accumulate valuable knowledge through our work and life, but it gets scattered across notes, conversations, and memory. **AGIfor.me** makes that knowledge AI-accessible while keeping your privacy in control.

**Perfect for:**
- Developers with hard-won debugging knowledge
- Consultants with client pattern insights  
- Anyone who learns from experience and wants to compound that knowledge

---

⭐ **Star this repo if it helps you build your personal AI knowledge base!**