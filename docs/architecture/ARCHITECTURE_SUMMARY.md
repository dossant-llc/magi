# AGIfor.me Architecture Summary
## Visual Architecture Guide

> **Complete system architecture with interactive diagrams**

This document provides the definitive visual guide to AGIfor.me's architecture - from the current privacy-first memory system to the full vision of local AI intelligence with context-aware assistance.

## System Overview

### AGIfor.me: Privacy-First Personal AI Knowledge System
```mermaid
graph TB
    subgraph "AI Assistants"
        A1[Claude Code]
        A2[ChatGPT]
        A3[Other MCP Clients]
    end
    
    subgraph "AGIfor.me Core"
        MCP[BrainBridge MCP Server]
        PE[Privacy Engine]
        CM[Consent Manager]
    end
    
    subgraph "Memory Storage"
        subgraph "Privacy Levels"
            PUB[public/]
            TEAM[team/]  
            PERS[personal/]
            PRIV[private/]
            SENS[sensitive/]
        end
        TEMP[examples/]
    end
    
    subgraph "User Interface"
        CLI[CLI Prompts]
        WEB[Web Dashboard<br/>localhost:3001]
    end
    
    A1 --> MCP
    A2 --> MCP
    A3 --> MCP
    
    MCP --> PE
    PE --> CM
    CM --> CLI
    CM --> WEB
    
    MCP --> PUB
    MCP --> TEAM
    MCP --> PERS
    MCP --> PRIV
    MCP --> SENS
    
    PE -.-> PUB
    PE -.-> TEAM
    PE -.-> PERS
    PE -.-> PRIV
    PE -.-> SENS
    
    style MCP fill:#e1f5fe
    style PE fill:#fff3e0
    style CM fill:#f3e5f5
```

### Complete Vision: Local AI with Smart Memory Synthesis
```mermaid
graph TB
    subgraph "AI Assistants"
        A1[Claude Code]
        A2[ChatGPT]
        A3[Other MCP Clients]
    end

    subgraph "Local AI Brain"
        subgraph "Ollama Models"
            CHAT[llama3.1:8b<br/>Chat/Reasoning]
            EMBED[mxbai-embed-large<br/>Embeddings]
        end

        subgraph "Vector Search"
            IDX[.magi-index/<br/>Vector Database]
        end

        subgraph "AI Engine"
            SEARCH[Semantic Search]
            SYNTHESIS[Smart Synthesis<br/>Nap Processing]
            CONSOLIDATE[Memory Consolidation]
        end
    end

    subgraph "AGIfor.me Core"
        MCP[BrainBridge MCP Server]
        PE[Privacy Engine]
        CM[Consent Manager]
    end

    subgraph "Memory Storage"
        subgraph "Privacy Levels"
            PUB[public/]
            TEAM[team/]
            PERS[personal/]
            PRIV[private/]
            SENS[sensitive/]
        end
    end

    subgraph "User Interfaces"
        CLI[magi CLI]
        WEB[Web Dashboard]
        REPL[Enhanced REPL]
    end

    A1 --> MCP
    A2 --> MCP
    A3 --> MCP

    CLI --> MCP
    WEB --> MCP
    REPL --> MCP

    MCP --> CHAT
    MCP --> EMBED

    EMBED --> IDX
    CHAT --> SEARCH
    CHAT --> SYNTHESIS
    CHAT --> CONSOLIDATE

    SEARCH --> MCP
    SYNTHESIS --> MCP
    CONSOLIDATE --> MCP

    MCP --> PE
    PE --> CM
    CM --> CLI
    CM --> WEB

    MCP --> PUB
    MCP --> TEAM
    MCP --> PERS
    MCP --> PRIV
    MCP --> SENS

    PE -.-> PUB
    PE -.-> TEAM
    PE -.-> PERS
    PE -.-> PRIV
    PE -.-> SENS

    style SYNTHESIS fill:#4caf50,color:#fff
    style CHAT fill:#e1f5fe
    style EMBED fill:#e8f5e8
    style MCP fill:#e1f5fe
    style PE fill:#fff3e0
    style CM fill:#f3e5f5
    style IDX fill:#fff2e6
```

## Smart Memory Processing

### Privacy-Aware Memory Access
```mermaid
graph LR
    subgraph "magi CLI Interface"
        CLI[magi CLI<br/>🧠 Your Personal AI]
    end

    subgraph "Memory Storage (Privacy-Protected)"
        PUB[public/]:::allowed
        TEAM[team/]:::allowed
        PERS[personal/]:::allowed
        PRIV[private/]:::allowed
        SENS[sensitive/]:::allowed
    end

    subgraph "AI Processing"
        CHAT[Chat Model<br/>Context-Aware Synthesis]
        EMBED[Embedding Model<br/>Semantic Search]
        SYNTHESIS[Smart Synthesis<br/>Nap Processing]
    end

    subgraph "Vector Index"
        IDX[.magi-index/<br/>Unified Knowledge Base]
    end

    CLI --> PUB
    CLI --> TEAM
    CLI --> PERS
    CLI --> PRIV
    CLI --> SENS

    CLI --> CHAT
    CLI --> EMBED
    CLI --> SYNTHESIS

    EMBED --> IDX
    SYNTHESIS --> IDX

    classDef allowed fill:#c8e6c9
```

## AI-Powered Knowledge Processing

### Intelligent Query Resolution with Smart Synthesis
```mermaid
sequenceDiagram
    participant U as User
    participant CLI as magi CLI
    participant AI as Local AI
    participant MCP as BrainBridge
    participant MEM as Memories
    participant SYN as Smart Synthesis

    U->>CLI: magi query plan family vacation
    CLI->>MCP: Process query request
    MCP->>AI: Analyze query + classify type
    AI->>MCP: Query classification + embeddings
    MCP->>MEM: Search with privacy filters
    MEM-->>MCP: Return matching memories
    MCP->>SYN: Memories + temporal context
    SYN->>SYN: Synthesize coherent response<br/>Nap processing
    SYN-->>MCP: Intelligent synthesis
    MCP-->>CLI: Coherent response + citations
    CLI-->>U: Smart answer (no raw dumps)
```

### AI-Assisted Knowledge Creation
```mermaid
sequenceDiagram
    participant U as User
    participant CLI as magi CLI
    participant AI as Local AI
    participant PE as Privacy Engine
    participant CM as Consent Manager
    participant MEM as Memory Storage
    participant GIT as Git

    U->>CLI: magi save Important insight about debugging
    CLI->>AI: Analyze content for privacy classification
    AI->>PE: Suggested privacy level + confidence
    PE->>CM: Check consent rules
    alt Low confidence classification
        CM->>U: Request classification confirmation
        U-->>CM: Confirm/Modify privacy level
    end
    CM-->>PE: Permission granted
    PE->>MEM: Write to appropriate privacy folder
    MEM->>GIT: Auto-commit changes
    GIT-->>MEM: Commit successful
    MEM-->>PE: Write complete
    PE-->>CLI: Success confirmation + location
    CLI-->>U: Memory saved to personal/ folder
```

## Context-Aware Intelligence

### Smart Query Processing
```mermaid
graph TD
    START([User has a question])
    QUERY[User: magi How do I debug React issues?]

    ANALYZE{AI analyzes query context}
    CLASSIFY[Classify query type:<br/>• Question vs Command<br/>• Personal vs Technical<br/>• Recent vs Historical]

    SEARCH[Semantic search across<br/>all privacy levels]
    TEMPORAL[Apply temporal weighting<br/>Recent memories prioritized]

    SYNTHESIS[Smart Synthesis<br/>Generate coherent response]
    RESPONSE[Intelligent answer<br/>Not raw file dumps]

    START --> QUERY
    QUERY --> ANALYZE
    ANALYZE --> CLASSIFY
    CLASSIFY --> SEARCH
    SEARCH --> TEMPORAL
    TEMPORAL --> SYNTHESIS
    SYNTHESIS --> RESPONSE

    style SYNTHESIS fill:#4caf50,color:#fff
    style CLASSIFY fill:#2196f3,color:#fff
    style TEMPORAL fill:#ff9800,color:#fff
    style RESPONSE fill:#e8f5e8
```

## Local AI Brain Architecture

### Complete Technology Stack for Privacy-First AI
```mermaid
graph TB
    subgraph "User Layer"
        CLI[magi CLI]
        REPL[Enhanced REPL]
        WEB[Web Dashboard]
    end

    subgraph "AI Processing Layer"
        subgraph "Chat Processing"
            OLLAMA[Ollama Runtime]
            LLAMA[llama3.1:8b]
        end

        subgraph "Embedding Processing"
            MXBAI[mxbai-embed-large]
        end

        subgraph "Smart Synthesis"
            SYNTHESIS[Nap Processing]
            TEMPORAL[Temporal Analysis]
            CONFLICT[Conflict Detection]
        end

        subgraph "Vector Storage"
            FAISS[FAISS Indexes]
            JSON[JSON Metadata]
        end
    end

    subgraph "Integration Layer"
        MCP[BrainBridge MCP]
        API[REST APIs]
        WS[WebSocket Events]
    end

    subgraph "Storage Layer"
        FS[File System<br/>Markdown Files]
        GIT[Git Repository]
        IDX[Index Files]
    end

    subgraph "Privacy Layer"
        PE[Privacy Engine]
        CM[Consent Manager]
        AL[Audit Logger]
    end

    CLI --> MCP
    REPL --> MCP
    WEB --> MCP

    MCP --> OLLAMA
    OLLAMA --> LLAMA
    OLLAMA --> MXBAI

    MCP --> SYNTHESIS
    SYNTHESIS --> TEMPORAL
    SYNTHESIS --> CONFLICT

    MXBAI --> FAISS
    FAISS --> JSON

    MCP --> API
    MCP --> WS

    MCP --> PE
    PE --> CM
    CM --> AL

    MCP --> FS
    FS --> GIT
    FAISS --> IDX

    style OLLAMA fill:#4caf50,color:#fff
    style LLAMA fill:#e1f5fe
    style MXBAI fill:#e8f5e8
    style SYNTHESIS fill:#4caf50,color:#fff
    style FAISS fill:#fff3e0
    style MCP fill:#e1f5fe
    style PE fill:#fff3e0
    style CM fill:#f3e5f5
```

## Future Architecture: Network Integration

### mAgi Network (Future Vision)
```mermaid
graph TB
    subgraph IG[Igor's mAgi]
        I_MAGI[Local magi System]
        I_MEM[Private Memory Bank]
        I_SYNTHESIS[Personal AI Synthesis]
    end

    subgraph NC[mAgi Network Cloud]
        DISCOVERY[P2P Discovery Service]
        PAYMENTS[Payment & Escrow]
        REPUTATION[Reputation System]
        MODERATION[Safety & Moderation]
    end

    subgraph AX[Expert's mAgi]
        A_MAGI[Expert magi System]
        A_MEM[Shareable Knowledge]
        A_EXPERTISE[Monetized Expertise]
    end

    subgraph CF[Community Features]
        REVIEWS[Expert Reviews]
        SEARCH[Expert Discovery]
        PRICING[Tiered Access]
    end

    I_MAGI --> DISCOVERY
    A_MAGI --> DISCOVERY

    DISCOVERY --> PAYMENTS
    DISCOVERY --> REPUTATION
    DISCOVERY --> MODERATION

    PAYMENTS --> REVIEWS
    REPUTATION --> SEARCH
    MODERATION --> PRICING

    I_MAGI -.-> A_MAGI
    A_MAGI -.-> I_MAGI

    style I_MAGI fill:#2196f3,color:#fff
    style A_MAGI fill:#4caf50,color:#fff
    style DISCOVERY fill:#ff9800,color:#fff
    style PAYMENTS fill:#9c27b0,color:#fff
```

---

## Mermaid Documentation Guidelines

### Diagram Standards
All architecture diagrams in this document follow these Mermaid conventions:

#### Color Coding
```mermaid
graph LR
    MAGI[magi CLI]:::controller
    SYNTHESIS[Smart Synthesis]:::synthesis
    MCP[BrainBridge]:::core
    PE[Privacy Engine]:::security
    MEMORIES[Memory Storage]:::storage

    MAGI --> MCP
    MCP --> SYNTHESIS
    MCP --> PE
    PE --> MEMORIES

    classDef controller fill:#4caf50,color:#fff
    classDef synthesis fill:#2196f3,color:#fff
    classDef core fill:#e1f5fe
    classDef security fill:#fff3e0
    classDef storage fill:#fff2e6
```

#### Diagram Types Used
- **Graph TB/LR**: System architecture and component relationships
- **SequenceDiagram**: Data flow and interaction patterns
- **Subgraphs**: Logical grouping of related components

### Usage Guide

#### For Developers
- **System Overview**: Start with "Complete Vision" to understand all components
- **Implementation**: Use "AI-Powered Knowledge Processing" for development guidance
- **Smart Synthesis**: Reference "Nap Processing" architecture for synthesis implementation

#### For Users
- **Privacy Model**: Review "Privacy-Aware Memory Access" for privacy guarantees
- **Query Processing**: See "Smart Query Processing" for how magi handles requests
- **Future Vision**: Check "mAgi Network" for roadmap understanding

#### For Contributors
- **Architecture**: Use "Complete Technology Stack" to understand dependencies
- **Feature Planning**: Reference diagrams when proposing new features
- **Documentation**: Keep diagrams updated as system evolves

### Viewing These Diagrams
This document is designed to be viewed through:
- **[architecture-viewer.html](../architecture-viewer.html)** - Interactive web viewer with enhanced Mermaid rendering
- **GitHub/GitLab** - Native markdown with Mermaid support
- **VS Code** - With Mermaid preview extensions
- **Any Mermaid-compatible markdown viewer**

---

*These Mermaid diagrams serve as the living visual foundation for understanding AGIfor.me's evolution from simple memory storage to intelligent, context-aware personal AI.*