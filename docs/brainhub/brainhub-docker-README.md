# BrainHub Docker 🧠🐳

**Docker-based hub for orchestrating multiple AI brain instances with visualization and hub-and-spoke communication**

> Transform your AI instances into a living, breathing network of connected minds with real-time visualization and cross-brain communication.

## 🎯 Overview

BrainHub Docker is the command center for managing multiple AI brain instances (Alice, Bob, Work, etc.) in a hub-and-spoke architecture with Docker containers. Think of it as a **containerized operations center for AI brains**.

```
       👁️ BrainNetwork Dashboard 
            ↙️    ↓    ↘️
    🧠 Alice   🧠 Bob   🧠 Work
      ↘️       ↙️  ↘️    ↙️
        📡 BrainXchange P2P
```

## ✨ Features

- 🎛️ **Instance Orchestration** - Spawn, manage, and monitor multiple brain instances
- 🌊 **Message Flow Visualization** - Watch queries travel between Alice → Bob → Work
- 📊 **Real-time Dashboard** - Network topology, performance metrics, and live logs
- 🐳 **Docker Integration** - Automatic container management and health monitoring
- 📡 **P2P Bridge** - Cross-brain communication with flow tracking
- 🔍 **Network Analytics** - Discover knowledge gaps and connection patterns

## 🚀 Quick Start

```bash
# Install dependencies
cd brainnetwork
npm install

# Start the orchestrator
npm run dev

# Launch the dashboard  
npm run dashboard

# Discover existing instances
curl http://localhost:3001/api/discover

# Create new brain instance
curl -X POST http://localhost:3001/api/instances \
  -H "Content-Type: application/json" \
  -d '{"name": "alice", "config": {"personality": "curious researcher"}}'
```

## 📁 Project Structure

```
brainnetwork/
├── src/
│   ├── orchestrator/           # Core orchestration
│   │   ├── BrainNetwork.ts     # Main controller
│   │   ├── InstanceManager.ts  # Docker management
│   │   └── MessageRouter.ts    # P2P routing
│   ├── bridge/                 # Communication layer
│   │   ├── FlowTracker.ts     # Message flow tracking
│   │   └── P2PBridge.ts       # Peer-to-peer bridge
│   ├── dashboard/             # Web interface
│   │   ├── components/        # React components
│   │   └── pages/            # Dashboard pages
│   └── types/                # TypeScript types
├── dashboard/                # Dashboard workspace
└── docker-compose.network.yml # Multi-instance setup
```

## 🎮 Usage Examples

### Instance Management
```typescript
import { BrainNetwork } from './src/orchestrator/BrainNetwork.js';

const network = new BrainNetwork(config);

// Spawn new instances
await network.spawnInstance({
  name: 'alice',
  config: {
    personality: 'curious researcher',
    specialization: ['science', 'technology']
  }
});

await network.spawnInstance({
  name: 'bob', 
  config: {
    personality: 'wine enthusiast',
    specialization: ['food', 'culture']
  }
});

// List all instances
const instances = await network.listInstances();
console.log(`Running: ${instances.length} brain instances`);
```

### Cross-Brain Communication
```typescript
// Send message from Alice to Bob
const flow = await network.sendMessage({
  from: 'alice',
  to: 'bob', 
  query: 'What wines pair best with Mediterranean food?'
});

// Watch the message flow
console.log(`Message ${flow.id}: ${flow.status}`);
flow.path.forEach(hop => {
  console.log(`  ${hop.timestamp}: ${hop.instance} - ${hop.action}`);
});

// Broadcast to all instances
const flows = await network.broadcastQuery(
  'alice',
  'What do you know about renewable energy?'
);
```

### Network Analysis
```typescript
// Get network topology
const topology = await network.getNetworkTopology();
console.log(`Network: ${topology.stats.activeInstances} active brains`);
console.log(`Messages: ${topology.stats.totalMessages} sent`);
console.log(`Avg Response: ${topology.stats.avgResponseTime}ms`);

// Visualize message flow
const flow = await network.visualizeFlow(messageId);
if (flow) {
  console.log('Message Path:');
  flow.path.forEach(hop => {
    console.log(`  ${hop.instance}: ${hop.action} (${hop.duration}ms)`);
  });
}
```

## 🌐 Dashboard Interface

Access the web dashboard at `http://localhost:3001`

### Views
- **Network Topology** - Visual graph of all instances and connections
- **Message Flow** - Real-time animation of queries traveling between brains  
- **Instance Manager** - Start/stop/create brain instances
- **Memory Browser** - Explore each instance's knowledge base
- **Log Viewer** - Multi-instance colorful log streaming
- **Performance Analytics** - Response times, error rates, usage patterns

### Real-time Features
- Live network topology updates
- Animated message flows
- WebSocket-powered log streaming
- Auto-refresh performance metrics

## 🔧 Configuration

Create `config.json`:
```json
{
  "brainbridgePath": "../brainbridge",
  "memoriesBasePath": "../",
  "defaultInstanceConfig": {
    "personality": "helpful assistant",
    "ollamaPort": 11434,
    "environment": {
      "TRACE_MODE": "true"
    }
  },
  "dashboard": {
    "port": 3001,
    "enableRealtimeUpdates": true,
    "refreshInterval": 1000
  }
}
```

## 🐳 Docker Integration

BrainNetwork automatically:
- Generates docker-compose files for each instance
- Manages container lifecycles (start/stop/restart)
- Monitors health and performance
- Handles port allocation (Ollama: 11434, 11435, 11436...)
- Maps memory directories (`../data/memories/profiles/alice`, `../data/memories/profiles/bob`)

### Instance Creation Flow
1. Create memory directory: `../memories.{name}`
2. Generate `docker-compose.{name}.yml`
3. Build and start containers
4. Wait for health check
5. Register in network topology

## 📡 P2P Communication

### Local Routing
```
Alice Query → BrainNetwork → MessageRouter → Bob Instance → Response
```

### Future: Remote P2P
```
Local Alice → BrainXchange Bridge → Remote Bob → Response
```

## 📊 Monitoring & Analytics

### Instance Metrics
- Memory file count
- Query response times  
- Uptime/downtime
- Error rates
- Container resource usage

### Network Metrics
- Message throughput
- Connection patterns
- Cross-brain knowledge gaps
- Performance bottlenecks

## 🎨 Visualization Features

### Network Graph (D3.js)
- Nodes: Brain instances (sized by activity)
- Edges: Communication paths (thickness = message volume)
- Animation: Real-time message flows
- Interactive: Click nodes for details

### Message Flow Animation
- Path highlighting as messages route
- Timing visualization (slow = red, fast = green)
- Error indicators
- Response content preview

## 🚧 Development Roadmap

### Phase 1: Core Platform ✅
- [x] Instance orchestration
- [x] Docker management
- [x] Message routing
- [x] Basic visualization

### Phase 2: Advanced Dashboard 🚧
- [ ] React dashboard
- [ ] D3.js network visualization
- [ ] Real-time log streaming
- [ ] Performance analytics

### Phase 3: P2P Extension 📋
- [ ] Remote peer discovery
- [ ] Cross-network routing
- [ ] Encrypted communication
- [ ] Distributed synchronization

### Phase 4: AI Enhancement 🔮  
- [ ] Automatic instance spawning
- [ ] Knowledge gap detection
- [ ] Load balancing
- [ ] Predictive scaling

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests with Docker
npm run test:integration

# Load testing
npm run test:load

# Network simulation
npm run test:network
```

## 📚 API Reference

### REST Endpoints
- `GET /api/instances` - List all instances
- `POST /api/instances` - Create new instance
- `DELETE /api/instances/{name}` - Destroy instance
- `POST /api/messages` - Send message
- `GET /api/topology` - Get network topology
- `GET /api/flows/{id}` - Get message flow details

### WebSocket Events
- `instance_created` - New brain spawned
- `message_sent` - Query in flight
- `message_received` - Response received  
- `topology_updated` - Network changed

## 🎯 Use Cases

### Research Team Collaboration
- **Alice**: Research papers and citations
- **Bob**: Technical implementation
- **Carol**: Market analysis
- Query: "What's the commercial potential of this research?"

### Personal Knowledge Management
- **Work**: Professional knowledge base
- **Personal**: Hobbies and interests  
- **Archive**: Historical information
- Cross-reference topics across all domains

### AI Development Testing
- **Stable**: Production knowledge
- **Experimental**: Testing new techniques
- **Sandbox**: Safe experimentation space
- Compare responses across different configurations

---

**Ready to build the future of connected AI minds?** 🚀

Start with:
```bash
git clone /path/to/brainnetwork
cd brainnetwork  
npm install
npm run dev
```

*Let's create a living network of artificial intelligence!* 🧠✨