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

### Complete Vision: Local AI with Multi-Context Intelligence
```mermaid
graph TB
    subgraph "AI Assistants"
        A1[Claude Code]
        A2[ChatGPT] 
        A3[Other MCP Clients]
    end
    
    subgraph "magi* Profile System"
        MAGI[magi<br/>Profile Switcher]
        MAGIC[magic<br/>Personal Profile<br/>📧 Like Personal Email]
        MAGIK[magik<br/>Business Profile<br/>📧 Like Work Email]
        MAGIA[magia<br/>Dev Profile<br/>📧 Like Dev Email]
        MAGO[mago<br/>Custom Profiles]
    end
    
    subgraph "Local AI Brain"
        subgraph "Ollama Models"
            CHAT[llama3.1:8b<br/>Chat/Reasoning]
            EMBED[mxbai-embed-large<br/>Embeddings]
        end
        
        subgraph "Vector Indexes"
            IDX1[.index-personal/<br/>magic profile]
            IDX2[.index-business/<br/>magik profile]
            IDX3[.index-dev/<br/>magia profile]
        end
        
        subgraph "AI Engine"
            SEARCH[Semantic Search]
            GENERATE[Content Generation]
            CONSOLIDATE[Memory Consolidation]
        end
    end
    
    subgraph "AGIfor.me Core"
        MCP[BrainBridge MCP Server]
        PE[Privacy Engine]
        CM[Consent Manager]
    end
    
    subgraph "Profile Memory Storage"
        subgraph "magic-memories/ (Personal)"
            PUB1[public/]
            PERS1[personal/]
            PRIV1[private/]
            SENS1[sensitive/]
        end
        subgraph "magik-memories/ (Business)"
            PUB2[public/]
            TEAM2[team/]
            PRIV2[private/]
            SENS2[sensitive/]
        end
        subgraph "magia-memories/ (Dev)"
            PUB3[public/]
            EXP3[experimental/]
            PRIV3[private/]
            SENS3[sensitive/]
        end
    end
    
    subgraph "User Interfaces"
        CLI[CLI Commands]
        WEB[Web Dashboard]
        MAGICCLI[magi* CLI]
    end
    
    A1 --> MCP
    A2 --> MCP
    A3 --> MCP
    
    MAGICCLI -.->|magi use magic| MAGI
    MAGICCLI -.->|magi use magik| MAGI
    MAGICCLI -.->|magi use magia| MAGI
    
    MAGI -->|Manual Switch| MAGIC
    MAGI -->|Manual Switch| MAGIK  
    MAGI -->|Manual Switch| MAGIA
    MAGI -->|Manual Switch| MAGO
    
    MAGIC --> CHAT
    MAGIK --> CHAT
    MAGIA --> CHAT
    
    MAGIC --> EMBED
    MAGIK --> EMBED
    MAGIA --> EMBED
    
    EMBED --> IDX1
    EMBED --> IDX2
    EMBED --> IDX3
    
    CHAT --> SEARCH
    CHAT --> GENERATE
    CHAT --> CONSOLIDATE
    
    SEARCH --> MCP
    GENERATE --> MCP
    CONSOLIDATE --> MCP
    
    MCP --> PE
    PE --> CM
    CM --> CLI
    CM --> WEB
    
    MAGIC -->|Profile Isolation| PUB1
    MAGIC -->|Profile Isolation| PERS1
    MAGIC -->|Profile Isolation| PRIV1
    MAGIC -->|Profile Isolation| SENS1
    
    MAGIK -->|Profile Isolation| PUB2
    MAGIK -->|Profile Isolation| TEAM2
    MAGIK -->|Profile Isolation| PRIV2
    MAGIK -->|Profile Isolation| SENS2
    
    MAGIA -->|Profile Isolation| PUB3
    MAGIA -->|Profile Isolation| EXP3
    MAGIA -->|Profile Isolation| PRIV3
    MAGIA -->|Profile Isolation| SENS3
    
    style MAGI fill:#4caf50,color:#fff
    style MAGIC fill:#2196f3,color:#fff
    style MAGIK fill:#ff9800,color:#fff
    style MAGIA fill:#9c27b0,color:#fff
    style CHAT fill:#e1f5fe
    style EMBED fill:#e8f5e8
    style MCP fill:#e1f5fe
    style PE fill:#fff3e0
    style CM fill:#f3e5f5
```

## Smart Context Separation

### Personal Context: Family & Life Intelligence
```mermaid
graph LR
    subgraph "magic Profile (Like Personal Email)"
        MP[magic CLI<br/>📧 Personal Context]
    end
    
    subgraph "magic-memories/ (Isolated Storage)"
        PUB[public/]:::allowed
        PERS[personal/]:::allowed
        PRIV[private/]:::allowed
        SENS[sensitive/]:::allowed
    end
    
    subgraph "Other Profiles (Inaccessible)"
        BUSINESS[magik-memories/]:::blocked
        DEV[magia-memories/]:::blocked
    end
    
    subgraph "AI Models"
        CHAT[Chat Model<br/>Casual Tone]
        EMBED[Embedding Model]
    end
    
    subgraph "Index"
        IDX[.magic-index/]
    end
    
    MP --> PUB
    MP --> PERS
    MP --> PRIV
    MP --> SENS
    
    MP -.- BUSINESS
    MP -.- DEV
    
    MP --> CHAT
    MP --> EMBED
    EMBED --> IDX
    
    classDef allowed fill:#c8e6c9
    classDef blocked fill:#ffcdd2
```

### Business Context: Professional & Strategic Intelligence
```mermaid
graph LR
    subgraph "magik Profile (Like Work Email)"
        BP[magik CLI<br/>📧 Business Context]
    end
    
    subgraph "magik-memories/ (Isolated Storage)"
        PUB[public/]:::allowed
        TEAM[team/]:::allowed
        PRIV[private/]:::allowed
        SENS[sensitive/]:::allowed
    end
    
    subgraph "Other Profiles (Inaccessible)"
        PERSONAL[magic-memories/]:::blocked
        DEV[magia-memories/]:::blocked
    end
    
    subgraph "AI Models"
        CHAT[Chat Model<br/>Professional Tone]
        EMBED[Embedding Model]
    end
    
    subgraph "Index"
        IDX[.magik-index/]
    end
    
    BP --> PUB
    BP --> TEAM
    BP --> PRIV
    BP --> SENS
    
    BP -.- PERSONAL
    BP -.- DEV
    
    BP --> CHAT
    BP --> EMBED
    EMBED --> IDX
    
    classDef allowed fill:#c8e6c9
    classDef blocked fill:#ffcdd2
```

## AI-Powered Knowledge Processing

### Intelligent Query Resolution
```mermaid
sequenceDiagram
    participant U as User
    participant MAGI as magi Selector
    participant PROFILE as Profile (magic/magik/magia)
    participant AI as Local AI
    participant MCP as BrainBridge
    participant MEM as Memories
    
    U->>MAGI: magi query "plan family vacation"
    MAGI->>MAGI: Analyze query context
    MAGI->>PROFILE: Select magic profile
    PROFILE->>AI: Send query + profile context
    AI->>AI: Generate embeddings
    AI->>MCP: Search with privacy filters
    MCP->>MEM: Access allowed memory levels
    MEM-->>MCP: Return matching memories
    MCP-->>AI: Filtered results
    AI->>AI: Generate contextual response
    AI-->>PROFILE: Response with citations
    PROFILE-->>MAGI: Formatted response
    MAGI-->>U: Answer with profile context
```

### AI-Assisted Knowledge Creation
```mermaid
sequenceDiagram
    participant U as User
    participant PROFILE as Profile
    participant AI as Local AI
    participant PE as Privacy Engine
    participant CM as Consent Manager
    participant MEM as Memory Storage
    participant GIT as Git
    
    U->>PROFILE: magik write "Q4 summary"
    PROFILE->>AI: Generate content request
    AI->>AI: Create content from memories
    AI->>PE: Request write permission
    PE->>CM: Check consent rules
    alt High privilege write
        CM->>U: Request user approval
        U-->>CM: Approve/Deny
    end
    CM-->>PE: Permission granted
    PE->>MEM: Write to appropriate location
    MEM->>GIT: Auto-commit changes
    GIT-->>MEM: Commit successful
    MEM-->>PE: Write complete
    PE-->>AI: Success confirmation
    AI-->>PROFILE: Operation complete
    PROFILE-->>U: Content written + audit log
```

## Context-Aware Intelligence

### Smart Context Switching (Email-like UX)
```mermaid
graph TD
    START([User wants to work])
    THINK{What context am I in?<br/>📧 Like choosing email account}
    
    PERSONAL_INTENT[Want to work on<br/>personal/family stuff]
    BUSINESS_INTENT[Want to work on<br/>business/work stuff]
    DEV_INTENT[Want to work on<br/>development/experiments]
    
    SWITCH_MAGIC[magi use magic<br/>📧 Personal Email Mode]
    SWITCH_MAGIK[magi use magik<br/>📧 Business Email Mode]  
    SWITCH_MAGIA[magi use magia<br/>📧 Dev Email Mode]
    
    CONFIRM_MAGIC[Switched to PERSONAL<br/>Business data inaccessible]
    CONFIRM_MAGIK[Switched to BUSINESS<br/>Personal data inaccessible]
    CONFIRM_MAGIA[Switched to DEVELOPMENT<br/>Production data isolated]
    
    USE_MAGIC[magic query "family plans"<br/>magic@personal:~$]
    USE_MAGIK[magik query "Q4 strategy"<br/>magik@business:~$]
    USE_MAGIA[magia query "test features"<br/>magia@dev:~$]
    
    START --> THINK
    THINK --> PERSONAL_INTENT
    THINK --> BUSINESS_INTENT
    THINK --> DEV_INTENT
    
    PERSONAL_INTENT --> SWITCH_MAGIC
    BUSINESS_INTENT --> SWITCH_MAGIK
    DEV_INTENT --> SWITCH_MAGIA
    
    SWITCH_MAGIC --> CONFIRM_MAGIC
    SWITCH_MAGIK --> CONFIRM_MAGIK
    SWITCH_MAGIA --> CONFIRM_MAGIA
    
    CONFIRM_MAGIC --> USE_MAGIC
    CONFIRM_MAGIK --> USE_MAGIK
    CONFIRM_MAGIA --> USE_MAGIA
    
    style SWITCH_MAGIC fill:#2196f3,color:#fff
    style SWITCH_MAGIK fill:#ff9800,color:#fff
    style SWITCH_MAGIA fill:#9c27b0,color:#fff
    style CONFIRM_MAGIC fill:#e8f5e8
    style CONFIRM_MAGIK fill:#fff3e0
    style CONFIRM_MAGIA fill:#f3e5f5
```

## Local AI Brain Architecture

### Complete Technology Stack for Privacy-First AI
```mermaid
graph TB
    subgraph "User Layer"
        CLI1[magi CLI]
        CLI2[magic CLI]
        CLI3[magik CLI]
        CLI4[magia CLI]
    end
    
    subgraph "Profile Management Layer"
        PM[Profile Manager]
        PS[Profile Selector]
        PC[Profile Configs]
    end
    
    subgraph "AI Processing Layer"
        subgraph "Chat Processing"
            OLLAMA[Ollama Runtime]
            LLAMA[llama3.1:8b]
        end
        
        subgraph "Embedding Processing"
            MXBAI[mxbai-embed-large]
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
    
    CLI1 --> PM
    CLI2 --> PM
    CLI3 --> PM
    CLI4 --> PM
    
    PM --> PS
    PS --> PC
    
    PM --> OLLAMA
    OLLAMA --> LLAMA
    OLLAMA --> MXBAI
    
    MXBAI --> FAISS
    FAISS --> JSON
    
    PM --> MCP
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
    style FAISS fill:#fff3e0
    style MCP fill:#e1f5fe
    style PE fill:#fff3e0
    style CM fill:#f3e5f5
```

## Future Architecture: Network Integration

### mAgi Network (Phase 5)
```mermaid
graph TB
    subgraph IG[Igor's mAgi]
        I_MAGI[Local magi System]
        I_PROFILES[magic/magik/magia]
        I_MEM[Private Memories]
    end
    
    subgraph NC[mAgi Network Cloud]
        DISCOVERY[P2P Discovery Service]
        PAYMENTS[Payment & Escrow]
        REPUTATION[Reputation System]
        MODERATION[Safety & Moderation]
    end
    
    subgraph AX[Alex's Expert mAgi]
        A_MAGI[Expert magi System]
        A_PROFILES[Monetized Profiles]
        A_MEM[Shareable Expertise]
    end
    
    subgraph CF[Community Features]
        REVIEWS[Expert Reviews]
        SEARCH[Expert Discovery]
        PRICING[Tiered Pricing]
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
    MAGI[magi Selector]:::controller
    MAGIC[magic Profile]:::personal  
    MAGIK[magik Profile]:::business
    MAGIA[magia Profile]:::development
    MCP[BrainBridge]:::core
    PE[Privacy Engine]:::security
    
    classDef controller fill:#4caf50,color:#fff
    classDef personal fill:#2196f3,color:#fff
    classDef business fill:#ff9800,color:#fff
    classDef development fill:#9c27b0,color:#fff
    classDef core fill:#e1f5fe
    classDef security fill:#fff3e0
```

#### Diagram Types Used
- **Graph TB/LR**: System architecture and component relationships
- **SequenceDiagram**: Data flow and interaction patterns
- **Subgraphs**: Logical grouping of related components

### Usage Guide

#### For Developers
- **System Overview**: Start with "Extended Architecture" to understand all components
- **Implementation**: Use "Component Interaction Patterns" for development guidance
- **Profile System**: Reference "Profile-Specific Memory Access" for access controls

#### For Users  
- **Understanding Profiles**: See "Profile Selection Logic" for how `magi` picks contexts
- **Privacy Model**: Review "Data Flow Architecture" for privacy guarantees
- **Future Vision**: Check "mAgi Network" for roadmap understanding

#### For Contributors
- **Architecture**: Use "Technical Stack Visualization" to understand dependencies
- **Feature Planning**: Reference diagrams when proposing new features
- **Documentation**: Keep diagrams updated as system evolves

### Viewing These Diagrams
This document is designed to be viewed through:
- **[architecture-viewer.html](./architecture-viewer.html)** - Interactive web viewer with enhanced Mermaid rendering
- **GitHub/GitLab** - Native markdown with Mermaid support
- **VS Code** - With Mermaid preview extensions
- **Any Mermaid-compatible markdown viewer**

---

*These Mermaid diagrams serve as the living visual foundation for understanding AGIfor.me's evolution from simple memory storage to intelligent, context-aware personal AI.*