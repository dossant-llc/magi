# 🧙 Magi - Hybrid Development Assistant Architecture

```mermaid
graph TB
    %% User Interface Layer
    User[👤 Developer] --> MagiCLI[🧙 Magi CLI<br/>scripts/chat-simple.js]
    User --> LogCompanion[📊 Log Companion<br/>npm run magi logs]
    
    %% Core Magi Components
    MagiCLI --> PatternEngine[⚡ Pattern Engine<br/>scripts/dev-patterns.js]
    MagiCLI --> DevHandlers[🔧 Dev Handlers<br/>scripts/dev-handlers.js]
    MagiCLI --> LLMFallback[🤖 LLM Auto-Fallback<br/>Ollama API]
    MagiCLI --> BBInterface[🧠 BrainBridge Interface<br/>MCP Protocol]
    
    %% Pattern Matching System
    PatternEngine --> SystemChecks[📊 System Status<br/>Process/Port/Health]
    PatternEngine --> CommandExplain[❓ Command Help<br/>npm script docs]
    PatternEngine --> MemoryPath[📁 Memory Location<br/>Path resolution]
    PatternEngine --> ProcessMgmt[⚙️ Process Management<br/>Kill/Restart/List]
    
    %% Local AI Layer
    LLMFallback --> OllamaService[🦙 Ollama Service<br/>localhost:11434]
    OllamaService --> LocalModels[🧠 Local Models<br/>llama3.1:8b, etc]
    
    %% BrainBridge Core System
    BBInterface --> BBServer[🧠 BrainBridge Server<br/>brainbridge/src/server.ts]
    BBServer --> AIService[🤖 AI Service<br/>services/ai-service.ts]
    BBServer --> EmbeddingService[🔍 Embedding Service<br/>services/embedding-service.ts]
    BBServer --> MemoryService[💾 Memory Service<br/>services/memory-service.ts]
    
    %% Memory Storage System
    MemoryService --> MemoryStore[(📚 Memory Store<br/>./memories/ or ~/Documents/memories)]
    MemoryStore --> PublicMem[🌍 public/<br/>General knowledge]
    MemoryStore --> TeamMem[👥 team/<br/>Work context]
    MemoryStore --> PersonalMem[🏠 personal/<br/>Personal insights]
    MemoryStore --> PrivateMem[🔒 private/<br/>Sensitive data]
    MemoryStore --> SensitiveMem[🚨 sensitive/<br/>Maximum security]
    
    %% External Services Integration
    BBServer --> BPConnector[🌉 Brain Proxy Connector<br/>services/brain-proxy-connector.ts]
    BBServer --> BXService[🔄 BrainXchange Service<br/>services/brainxchange.ts]
    
    %% Brain Proxy (Cloud Connector)
    BPConnector --> BrainProxy[☁️ Brain Proxy<br/>Remote AI Bridge]
    BrainProxy --> CloudAI[🌐 Claude Code<br/>Remote Assistant]
    
    %% BrainXchange (P2P Network)
    BXService --> BXServer[🔗 BrainXchange Server<br/>services/brainxchange/server/]
    BXServer --> P2PNetwork[🌐 P2P Knowledge Network<br/>Distributed memories]
    
    %% BrainCloud (Web Platform)
    BBServer --> BCConnector[☁️ BrainCloud Connector<br/>Optional web platform]
    BCConnector --> BrainCloud[🌐 BrainCloud<br/>services/braincloud/]
    
    %% Logging & Monitoring
    LogCompanion --> LogFiles[(📝 Log Files<br/>brainbridge/logs/)]
    BBServer --> LogFiles
    BXServer --> LogFiles
    OllamaService --> LogFiles
    
    %% External Dependencies
    EmbeddingService --> OllamaEmbeddings[🔢 Ollama Embeddings<br/>Vector generation]
    AIService --> OllamaService
    
    %% Data Flow Indicators
    classDef userInterface fill:#e1f5fe
    classDef magiCore fill:#f3e5f5
    classDef brainbridge fill:#e8f5e8
    classDef storage fill:#fff3e0
    classDef external fill:#fce4ec
    classDef ai fill:#e3f2fd
    
    class User,MagiCLI,LogCompanion userInterface
    class PatternEngine,DevHandlers,SystemChecks,CommandExplain,MemoryPath,ProcessMgmt magiCore
    class BBInterface,BBServer,AIService,EmbeddingService,MemoryService brainbridge
    class MemoryStore,PublicMem,TeamMem,PersonalMem,PrivateMem,SensitiveMem,LogFiles storage
    class BPConnector,BXService,BXServer,BCConnector,BrainProxy,BrainCloud,P2PNetwork,CloudAI external
    class LLMFallback,OllamaService,LocalModels,OllamaEmbeddings ai
```

## 🧙 Magi Routing Logic

```mermaid
flowchart TD
    Input[📝 User Input] --> PatternCheck{⚡ Pattern Match?}
    
    %% Tier 1: Instant Pattern Responses
    PatternCheck -->|Yes| InstantResponse[⚡ Instant Dev Response<br/>Process status, ports, commands]
    InstantResponse --> Done[✅ Complete]
    
    %% Tier 2: LLM Processing
    PatternCheck -->|No| LLMCheck{🤖 ask: prefix OR<br/>Complex dev question?}
    LLMCheck -->|Yes| LocalLLM[🦙 Local LLM Query<br/>Ollama API]
    LocalLLM --> LLMSuccess{Success?}
    LLMSuccess -->|Yes| Done
    LLMSuccess -->|No| AutoFallback
    
    %% Tier 2.5: Auto-fallback for dev questions
    LLMCheck -->|No| DevQuestion{🔧 Dev-related question?}
    DevQuestion -->|Yes| AutoFallback[🤖 Auto-fallback to LLM]
    AutoFallback --> LLMFallbackTry{LLM Available?}
    LLMFallbackTry -->|Yes| Done
    LLMFallbackTry -->|No| BrainBridge
    
    %% Tier 3: Memory Search
    DevQuestion -->|No| BrainBridge[🧠 BrainBridge Memory<br/>MCP Protocol]
    BrainBridge --> Done
    
    classDef tier1 fill:#e8f5e8
    classDef tier2 fill:#e3f2fd
    classDef tier3 fill:#fff3e0
    classDef decision fill:#f3e5f5
    
    class InstantResponse tier1
    class LocalLLM,AutoFallback tier2
    class BrainBridge tier3
    class PatternCheck,LLMCheck,DevQuestion,LLMSuccess,LLMFallbackTry decision
```

## 🏗️ System Components

### 🧙 Magi Layer
- **Pattern Engine**: Regex-based instant responses for dev queries
- **Dev Handlers**: System checks (processes, ports, status)
- **LLM Auto-fallback**: Ollama integration for complex questions
- **Log Companion**: Real-time log streaming with `tail -f`

### 🧠 BrainBridge Layer  
- **MCP Server**: Model Context Protocol for AI integration
- **Memory Service**: Privacy-aware knowledge storage
- **Embedding Service**: Vector search with Ollama embeddings
- **AI Service**: Local LLM integration and query handling

### 📚 Storage Layer
- **Memory Folders**: Privacy-tiered knowledge organization
- **Embeddings**: Vector representations for semantic search  
- **Log Files**: Structured logging with timestamps

### 🌐 External Services
- **Brain Proxy**: Cloud AI connector (Claude Code integration)
- **BrainXchange**: P2P knowledge sharing network
- **BrainCloud**: Optional web platform interface
- **Ollama**: Local AI models and embeddings

### 🔄 Data Flow
1. **User Query** → Pattern matching for instant responses
2. **Complex Questions** → Local LLM processing 
3. **Memory Queries** → BrainBridge semantic search
4. **All Activities** → Structured logging and monitoring

This architecture provides a hybrid development experience with instant responses for common tasks, intelligent LLM fallback for complex questions, and comprehensive memory management through the BrainBridge system.