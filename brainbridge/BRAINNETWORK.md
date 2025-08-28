# BrainNetwork Architecture

**A visual orchestration platform for multiple BrainBridge instances with peer-to-peer communication**

## 🎯 Vision

BrainNetwork is a central control system that manages multiple isolated memory instances (Alice, Bob, Work, etc.), visualizes information flow between them, and provides a real-time dashboard for monitoring peer-to-peer brain communication.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BrainNetwork Dashboard                       │
│  👁️ Visual Flow • 🎛️ Instance Manager • 📊 Real-time Logs      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│ Alice │    │  Bob  │    │ Work  │
│ 🧠💭📝 │    │ 🧠💭📝 │    │ 🧠💭📝 │
│memories│    │memories│    │memories│
└───┬───┘    └───┬───┘    └───┬───┘
    │            │            │
    └────────────┼────────────┘
                 │
         ┌───────▼───────┐
         │  BrainXchange │
         │   P2P Bridge  │  
         │    🌐📡↕️     │
         └───────────────┘
```

## 🧩 Core Components

### 1. BrainNetwork Orchestrator
**Central control system managing the entire network**

```typescript
class BrainNetwork {
  instances: Map<string, BrainInstance>      // alice, bob, work, etc.
  brainXchange: P2PBridge                    // peer-to-peer routing
  dashboard: WebUI                           // visualization interface
  messageTracker: FlowTracker               // trace message paths
  
  // Instance Management
  async spawnInstance(name: string, config: InstanceConfig): Promise<BrainInstance>
  async destroyInstance(name: string): Promise<void>
  async listInstances(): Promise<InstanceInfo[]>
  
  // Message Routing
  async sendMessage(from: string, to: string, query: string): Promise<MessageFlow>
  async broadcastQuery(from: string, query: string): Promise<MessageFlow[]>
  
  // Visualization
  async visualizeFlow(messageId: string): Promise<FlowVisualization>
  async getNetworkTopology(): Promise<NetworkGraph>
}
```

### 2. BrainInstance
**Individual memory containers with Docker orchestration**

```typescript
interface BrainInstance {
  name: string                    // alice, bob, work
  containerId: string             // docker container ID
  memoriesPath: string           // ../memories.alice
  mcpEndpoint: string            // HTTP endpoint (e.g., http://localhost:8147)
  status: 'running' | 'stopped'  // current state
  
  // Memory Operations
  query(question: string): Promise<MemoryResult>
  save(content: string, category?: string): Promise<void>
  
  // Docker Management  
  start(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  getLogs(): Promise<LogEntry[]>
}
```

### 3. P2P Bridge (BrainXchange)
**Peer-to-peer communication layer**

```typescript
class BrainXchange {
  localInstances: Map<string, BrainInstance>
  remoteConnections: Map<string, RemotePeer>
  messageRouter: MessageRouter
  
  // Local Routing
  async routeLocal(from: string, to: string, message: Message): Promise<Response>
  
  // Remote P2P (Future)
  async connectToPeer(address: string): Promise<RemotePeer>
  async routeRemote(targetPeer: string, message: Message): Promise<Response>
  
  // Message Flow Tracking
  async trackMessage(messageId: string): Promise<MessagePath>
}
```

### 4. Visual Dashboard
**Real-time web interface for monitoring and control**

```typescript
interface DashboardUI {
  // Network Visualization
  networkGraph: D3NetworkGraph        // visual topology
  messageFlows: AnimatedPathways      // real-time message tracing
  
  // Instance Management
  instancePanel: InstanceManager      // start/stop/create instances
  memoryBrowser: MemoryExplorer      // browse each instance's data
  
  // Real-time Monitoring  
  logStreams: MultiLogViewer         // colorful logs from all instances
  performanceMetrics: MetricsDashboard // response times, memory usage
  
  // Interactive Controls
  messageSimulator: QueryInterface    // "Send as Alice to Bob"
  networkController: P2PManager      // manage connections
}
```

## 🔄 Message Flow Architecture

### Local Message Flow
```
User Input: "Ask Alice about Docker"
     ↓
[Dashboard] → [BrainNetwork] → [Alice Instance]
     ↓              ↓              ↓
[Visualizer] ← [FlowTracker] ← [MCP Response]
     ↓
[UI Updates with response + visual flow]
```

### Cross-Instance Communication
```
User: "Alice asks Bob about his wine preferences"
     ↓
[Dashboard] → [BrainNetwork]
     ↓              ↓
[Alice Instance] → [BrainXchange] → [Bob Instance]
     ↓                   ↓              ↓
[Alice Memory] ← [Message Router] ← [Bob Memory]
     ↓                   ↓              ↓
[Response] → [Flow Visualization] ← [Response]
     ↓
[Dashboard shows complete conversation path]
```

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure ✅ COMPLETED
- [x] Docker instance management (✅ Alice, Bob, Carol, Knor containers)
- [x] BrainNetwork orchestrator class (✅ HTTP-based architecture)
- [x] Instance spawning/management API (✅ Auto-discovery working)
- [x] Basic message routing between instances (✅ @mention detection & routing)

### Phase 2: Visualization Layer 🔄 IN PROGRESS  
- [x] Web dashboard with real-time updates (✅ http://localhost:3001)
- [ ] Network topology visualization (D3.js)
- [x] Message flow animation (✅ Flow tracking with IDs)
- [x] Multi-instance log streaming (✅ Real-time WebSocket updates)

### Phase 3: Advanced Features
- [ ] Memory browser interface
- [ ] Query performance analytics
- [ ] Instance templates and presets
- [ ] Export/import network configurations

### Phase 4: P2P Extension
- [ ] Remote peer discovery
- [ ] Encrypted P2P communication
- [ ] Distributed memory synchronization
- [ ] Cross-network brain connections

## ✅ HTTP Architecture Migration (August 2025)

**Successfully migrated from stdio-based to HTTP-based communication architecture!**

### Migration Overview
The BrainNetwork system has been successfully migrated from one-shot `docker exec` stdio commands to persistent HTTP endpoints, resolving critical issues with stdio premature closure and enabling proper BrainXchange networking support.

### Key Changes Made

**1. BrainBridge Container Updates:**
- Updated `Dockerfile` to run in HTTP mode instead of stdio mode
- Changed CMD from `["node", "dist/server.js", "stdio"]` to `["node", "dist/server.js", "http", "8147"]`
- Added HTTP health check endpoint: `/health`
- Exposed container ports for external HTTP access

**2. HTTP Port Mapping:**
- **Alice**: `http://localhost:8147` (port 8147)
- **Bob**: `http://localhost:8148` (port 8148)
- **Carol**: `http://localhost:8149` (port 8149)
- **Knor**: `http://localhost:8152` (port 8152)

**3. MessageRouter HTTP Integration:**
- Replaced shell-based `docker exec` commands with HTTP POST requests
- Updated MCP communication to use persistent HTTP endpoints
- Added proper error handling for HTTP failures vs SIGTERM issues

**4. Cross-Brain Query Flow (NEW):**
```
User: "Hey @alice, what's your favorite food?"
     ↓
[BrainNetwork API] receives POST /api/messages
     ↓  
[MessageRouter] detects @mention → routes to Alice
     ↓
[HTTP Request] → POST http://localhost:8147/mcp
     ↓
[Alice Container] processes query via persistent HTTP server
     ↓
[Response] → "Fresh sushi rolls — precise, balanced, and elegant."
     ↓  
[Flow Tracking] → Archives successful completion
```

### Technical Benefits Achieved

**✅ Resolved Issues:**
- **SIGTERM Premature Closure**: HTTP servers remain persistent, eliminating one-shot process termination
- **BrainXchange Networking**: Persistent Node.js processes now support P2P address broadcasting
- **Reliability**: HTTP requests have proper error handling vs unpredictable shell command failures
- **Performance**: ~16-30ms response times for cross-brain queries

**✅ Architecture Improvements:**
- **Persistent Processes**: Each brain container runs a continuous HTTP server
- **Standard Protocol**: HTTP/JSON communication instead of shell-based stdio
- **Health Monitoring**: `/health` endpoints for container status checking
- **Scalability**: Easy to add new brain instances with unique HTTP ports

### Testing Results
```bash
# All brain containers responding successfully
curl http://localhost:8147/health  # Alice: {"status":"ok"}
curl http://localhost:8148/health  # Bob: {"status":"ok"} 
curl http://localhost:8149/health  # Carol: {"status":"ok"}

# Cross-brain queries working perfectly
POST http://localhost:3001/api/messages
{"from": "bob", "query": "Hey @alice, what's your favorite food?"}
→ Successfully routes to Alice and returns sushi preference

# BrainNetwork discovery working
GET http://localhost:3001/api/instances
→ Auto-discovers all 4 running brain instances with correct HTTP endpoints
```

### Implementation Status
- [x] ✅ **Phase 1 Complete**: HTTP architecture migration successful
- [x] ✅ **Container Migration**: All brain instances converted to HTTP mode  
- [x] ✅ **MessageRouter Update**: HTTP requests replace docker exec commands
- [x] ✅ **Cross-Brain Testing**: @mention detection and routing verified
- [x] ✅ **BrainXchange Ready**: Persistent processes support P2P networking
- [ ] 🔄 **Query Optimization**: Regex improvements for better search matching

## 🛠️ Technology Stack

**Backend:**
- **Orchestrator**: Node.js/TypeScript
- **Docker API**: dockerode library
- **WebSocket**: Real-time dashboard updates
- **Message Queue**: Redis for flow tracking

**Frontend:**
- **Framework**: React/Next.js
- **Visualization**: D3.js for network graphs
- **Real-time**: Socket.io for live updates
- **Styling**: Tailwind CSS + shadcn/ui

**Infrastructure:**
- **Containers**: Docker Compose for instances
- **Process Management**: PM2 for orchestrator
- **Monitoring**: Custom metrics + beautiful logs

## 📁 Project Structure

```
brainnetwork/
├── src/
│   ├── orchestrator/           # Central control system
│   │   ├── BrainNetwork.ts     # Main orchestrator
│   │   ├── InstanceManager.ts  # Docker container management
│   │   └── MessageRouter.ts    # P2P routing logic
│   ├── bridge/                 # BrainXchange P2P layer
│   │   ├── P2PBridge.ts       # Peer communication
│   │   └── FlowTracker.ts     # Message path tracking
│   ├── dashboard/             # Web UI
│   │   ├── components/        # React components
│   │   ├── hooks/            # Real-time data hooks
│   │   └── pages/            # Dashboard pages
│   └── types/                # Shared TypeScript types
├── instances/                # Instance configuration templates
├── docker-compose.network.yml # Multi-instance setup
└── README.md                 # Getting started guide
```

## 🎮 Usage Examples

### Spawn New Brain Instance
```typescript
await brainNetwork.spawnInstance('alice', {
  memoriesPath: '../memories.alice',
  personality: 'curious researcher',
  specialization: ['science', 'technology']
});
```

### Cross-Brain Communication
```typescript
const flow = await brainNetwork.sendMessage(
  'alice',           // from
  'bob',            // to  
  'What wines do you recommend for a dinner party?'
);

// Watch the message flow in real-time
await dashboard.visualizeFlow(flow.messageId);
```

### Network Analysis
```typescript
const topology = await brainNetwork.getNetworkTopology();
const insights = await analyzer.findKnowledgeGaps(topology);
// Shows what Alice knows that Bob doesn't, etc.
```

## 🌟 Future Vision

**BrainNetwork becomes a living ecosystem where:**
- Multiple AI personalities collaborate and share knowledge
- Information flows are visualized like neural pathways
- Knowledge gaps are automatically identified and filled
- Cross-brain insights emerge from collective intelligence
- Remote brains can join the network from anywhere

**The ultimate goal:** A beautiful, intuitive interface for orchestrating multiple AI minds working together! 🧠🌐✨

---

*Ready to build the future of connected AI minds? Let's start with Phase 1!* 🚀