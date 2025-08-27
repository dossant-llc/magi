# AGIfor.me

> **Your Personal AI Knowledge Base - Privacy-First, Open Source**

🔒 **PRIVATE DEVELOPMENT** - This repository is currently private for collaborative review before public launch.

⚠️ **EARLY STAGE NOTICE**: This is ground-floor development focused on core privacy and UX patterns. Performance optimization, scalability, and production hardening come in later phases. We're prioritizing "does it solve the right problem" over "does it scale to millions of users."

## 🌟 Why AGIfor.me?

**The Problem**: We all accumulate valuable knowledge through work and life, but it gets scattered across notes, conversations, and memory. When we need it, we can't find it. When AI assistants help us, they lack our personal context.

**The Vision**: What if your AI assistant actually knew your preferences, your past lessons learned, and your personal context - but only when you explicitly allow it?

**The Solution**: AGIfor.me creates a privacy-first personal knowledge base that integrates with AI assistants through ethical, consent-driven access patterns.

## 🚀 Quick Start

```bash
git clone https://github.com/dossant-llc/agiforme
cd agiforme
npm install
./start.sh
```

## 🎯 Real-World Use Cases

### For Professionals
- **Consultants**: "Remember how we solved that client's inventory problem? What were the key lessons?"
- **Developers**: "What were the debugging steps that worked for that network issue last month?"
- **Managers**: "Based on past team challenges, what should I watch out for in this project?"

### For Families  
- **Trip Planning**: "What restaurants did Sarah love in Italy? What activities worked best with the kids?"
- **Life Lessons**: "What approaches have worked when dealing with teenager conflicts?"
- **Health Tracking**: "What triggers have I noticed for my migraines over the past year?"

### For Learners
- **Research**: "Consolidate everything I've learned about sustainable investing"
- **Skills**: "Track my progress learning Spanish - what methods work best for me?"
- **Ideas**: "Connect my scattered thoughts about work-life balance into actionable insights"

## ⚖️ Ethical AI Principles

### Privacy by Design
- **Your data stays yours**: Memories stored locally, never uploaded without explicit consent
- **Granular control**: Choose what each AI assistant can access, down to specific folders
- **Audit transparency**: See exactly when and what was accessed by whom
- **No surveillance capitalism**: No advertising, no data harvesting, no hidden agendas

### Consent-Driven AI
- **Explicit permission**: AI assistants must request access to your memories
- **Context boundaries**: Work memories stay separate from personal memories
- **Revokable access**: Change permissions anytime, instantly effective
- **Clear intent**: You always know when AI is using your personal context vs. generic knowledge

### Open Source Ethics
- **Community owned**: AGPL v3 ensures improvements benefit everyone
- **Transparent algorithms**: All privacy and categorization logic is inspectable
- **No vendor lock-in**: Your data in standard markdown files, portable anywhere
- **Democratic development**: Features driven by user needs, not corporate interests

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

## 🎮 How It Works (The "magi" Wake Word)

AGIfor.me uses a familiar wake word system - just like "Hey Siri" or "Alexa":

```bash
# Without wake word = generic AI response
"Help me plan a vacation to Italy"
→ Generic travel advice

# With wake word = your personal AI activated  
"magi help me plan a vacation to Italy"
→ Searches your travel memories, family preferences, past trips
→ Personalized recommendations based on YOUR knowledge
```

**Context-Aware Wake Words:**
- `magi` - Smart context detection with local processing
- `magic` - Personal/family context with cloud services (with consent)  
- `magik` - Business context, local-only for maximum privacy
- `magia` - Development context with experimental features

*It's like having different "drive letters" (C:, A:, D:) but for AI contexts!*

## 🛠️ Setup

### System Requirements
- **Node.js**: v22+ (recommended)
- **Operating System**: macOS, Linux (tested on macOS)
- **Memory**: 4GB+ RAM for basic operation
- **Storage**: 1GB+ free space for memories and dependencies
- **AI Assistant**: MCP-compatible (Claude Code, Claude Desktop)

### For Local AI Hackers 🤖
Want to run your own local LLM? Hell yes! Here's what you'll need:
- **RAM**: 8-16GB+ (more = better for larger models)
- **GPU**: CUDA-compatible GPU for speed (optional but sweet)
- **Storage**: 5-50GB for model weights (depending how ambitious you get)
- **Ollama**: The easiest way to run local models (we'll guide you through it)

### Prerequisites
- npm or yarn package manager
- Git for version control

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/dossant-llc/agiforme
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

**With Claude Code/Desktop:**
```
You: "magi what debugging steps worked for that network issue last month?"
Claude: [searches your personal debugging memories]
→ "Based on your notes, you discovered it was DNS cache poisoning. 
   The steps that worked were: 1) flush DNS cache, 2) check upstream..."

You: "magi add this lesson: Always verify DNS upstream before client-side fixes"  
Claude: [adds to your troubleshooting knowledge with smart privacy categorization]
→ "Added to your professional memories in the 'network-debugging' section"
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

### YOU Control Your Data - Completely
**Today (MVP):**
- **Standard formats**: Markdown files, JSON metadata - readable by any tool
- **Export anytime**: `git archive` your memories folder = complete backup
- **Local files**: Your data stays on your machine in simple folder structure

**Future Vision:**
- **Pluggable storage**: Interface designed for multiple backends (files, databases, cloud)
- **Import from anywhere**: Drag and drop existing notes into privacy folders
- **Advanced backends**: Vector databases, distributed storage, whatever Alex suggests 😄

*Storage backend will evolve, but your data always stays under your control in standard formats.*

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

- **[docs/ARCHITECTURE_SUMMARY.md](docs/ARCHITECTURE_SUMMARY.md)** - Visual architecture guide with interactive diagrams
- **[docs/architecture-viewer.html](docs/architecture-viewer.html)** - Enhanced HTML viewer with better Mermaid rendering
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and technical details
- **[docs/MULTI_PROFILE_DESIGN.md](docs/MULTI_PROFILE_DESIGN.md)** - Wake word system and context switching design
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Development phases and future features  
- **[docs/PRIVACY_DESIGN.md](docs/PRIVACY_DESIGN.md)** - Detailed privacy and consent system design

## 🤝 Contributing & Community

**We're building this together!** AGIfor.me is designed as a community-driven project where privacy experts, AI ethicists, and developers collaborate to create ethical AI tooling.

### Ways to Contribute
- **AI Ethics**: Help refine consent systems, privacy boundaries, and ethical guidelines
- **Hacker Projects**: Build wild integrations, experiment with local AI models, create cool demos
- **Core Development**: Improve architecture, add features, enhance documentation  
- **AI/ML Engineering**: Advanced embedding strategies, vector optimization, model fine-tuning (future phases)
- **Privacy Research**: Contribute to smart categorization and privacy classification algorithms
- **User Experience**: Design better consent flows and privacy controls
- **Community**: Share your hacks, provide feedback, help others get their setup running

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

### Community Spaces
- **Discord**: Coming soon! (Zack's probably already planning the channels 😄)
- **GitHub Discussions**: For feature requests, architecture discussions, and Q&A
- **Issues**: Bug reports, feature ideas, and development coordination

### Values-Driven Development
- **Privacy advocates welcome**: Help us build better consent systems
- **Hackers & tinkerers**: Architecture designed for experimentation and wild ideas
- **Open source enthusiasts**: Democratic development, no corporate overlords
- **AI researchers**: Contribute to ethical AI patterns and privacy-preserving techniques
- **Real users**: Your use cases and hacks drive our feature priorities

## 📄 License

**Dual Licensed** - Choose what works for you:

- 🏠 **Personal Use**: Free under AGPL v3 license
- 🏢 **Commercial Use**: Commercial license available for proprietary modifications

This ensures the project stays open source while protecting innovation. See [LICENSE](LICENSE) file for full details.

💼 **Commercial licensing inquiries welcome** - Contact maintainers for enterprise licensing options.

## 🎯 The Bigger Picture

### Why This Matters
In an era where AI companies harvest our data for training and profit, **AGIfor.me** represents a different path: **AI that serves you, not surveillance capitalism**.

We believe:
- **Your knowledge belongs to you** - not to tech companies
- **Privacy is a fundamental right** - not a luxury feature  
- **AI should augment human intelligence** - not replace human agency
- **Open source creates better outcomes** - than proprietary black boxes

### The Community We're Building
- **Ethical AI practitioners** who prioritize user agency over engagement metrics
- **Privacy advocates** who want practical tools, not just policy papers
- **Open source contributors** who believe in democratic technology development
- **Real humans** who want AI to remember their context without sacrificing their privacy

---

## 🚀 Ready to Get Started?

1. **Try it**: Follow the [Quick Start](#-quick-start) to set up your personal knowledge base
2. **Explore**: Check out the [Architecture Viewer](docs/architecture-viewer.html) to understand the system
3. **Contribute**: Join us in building ethical AI tools that respect human agency
4. **Share**: Help others discover privacy-first AI alternatives

⭐ **Star this repo if you believe AI should serve humans, not harvest them!**

*Together, we're building the future of personal AI - one that puts privacy, consent, and human agency first.*