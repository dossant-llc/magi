// Core Types for BrainNetwork

export interface BrainInstance {
  name: string;                    // alice, bob, work
  containerId?: string;            // docker container ID
  containerName: string;           // brainbridge-alice
  memoriesPath: string;           // ../memories.alice
  mcpEndpoint: string;            // docker exec command
  status: 'running' | 'stopped' | 'starting' | 'error';
  created: Date;
  lastActivity?: Date;
  
  // Configuration
  config: InstanceConfig;
  
  // Stats
  stats: InstanceStats;
}

export interface InstanceConfig {
  personality?: string;            // "curious researcher"
  specialization?: string[];       // ["science", "technology"]
  memorySize?: string;            // "1GB"
  ollamaPort: number;             // 11434, 11435, etc.
  environment: Record<string, string>;
}

export interface InstanceStats {
  memoryFiles: number;
  totalQueries: number;
  avgResponseTime: number;
  uptime: number;                 // milliseconds
  lastError?: string;
}

export interface MessageFlow {
  id: string;
  from: string;                   // alice
  to: string | string[];          // bob or ["bob", "work"]
  query: string;
  timestamp: Date;
  status: 'pending' | 'routing' | 'processing' | 'completed' | 'error';
  
  // Flow tracking
  path: MessageHop[];
  response?: string;
  error?: string;
  duration?: number;              // milliseconds
}

export interface MessageHop {
  instance: string;               // alice, bob, brainxchange
  timestamp: Date;
  action: 'send' | 'receive' | 'process' | 'route' | 'initiated' | 'responded';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface NetworkTopology {
  instances: BrainInstance[];
  connections: Connection[];
  messageFlows: MessageFlow[];
  stats: NetworkStats;
}

export interface Connection {
  from: string;
  to: string;
  type: 'local' | 'p2p' | 'remote';
  status: 'active' | 'inactive';
  lastUsed?: Date;
  messageCount: number;
}

export interface NetworkStats {
  totalInstances: number;
  activeInstances: number;
  totalMessages: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

// Dashboard UI Types
export interface DashboardState {
  networkTopology: NetworkTopology;
  selectedInstance?: string;
  selectedMessage?: string;
  viewMode: 'topology' | 'logs' | 'browser' | 'simulator';
}

// Event Types
export interface NetworkEvent {
  type: 'instance_created' | 'instance_started' | 'instance_stopped' | 
        'message_sent' | 'message_received' | 'error_occurred';
  timestamp: Date;
  instanceName?: string;
  messageId?: string;
  data: Record<string, any>;
}

// API Types
export interface CreateInstanceRequest {
  name: string;
  config: Partial<InstanceConfig>;
  memoriesPath?: string;
}

export interface SendMessageRequest {
  from: string;
  to: string | string[];
  query: string;
  trackFlow?: boolean;
}

export interface QueryInstanceRequest {
  instance: string;
  query: string;
}

// Docker Integration Types
export interface DockerContainerInfo {
  id: string;
  name: string;
  state: string;
  status: string;
  image: string;
  ports: DockerPort[];
  mounts: DockerMount[];
}

export interface DockerPort {
  privatePort: number;
  publicPort?: number;
  type: string;
}

export interface DockerMount {
  source: string;
  destination: string;
  mode: string;
}

// Monitoring Types
export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'trace';
  message: string;
  instance: string;
  metadata?: Record<string, any>;
}

export interface MetricSnapshot {
  timestamp: Date;
  instance: string;
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    errorCount: number;
  };
}

// Configuration Types
export interface BrainNetworkConfig {
  brainbridgePath: string;         // ../brainbridge
  memoriesBasePath: string;        // ../
  defaultInstanceConfig: InstanceConfig;
  dashboard: DashboardConfig;
  monitoring: MonitoringConfig;
}

export interface DashboardConfig {
  port: number;                    // 3001
  enableRealtimeUpdates: boolean;
  refreshInterval: number;         // milliseconds
}

export interface MonitoringConfig {
  logLevel: string;
  metricsRetention: number;        // days
  alertThresholds: {
    responseTime: number;          // ms
    errorRate: number;            // percentage
    memoryUsage: number;          // percentage
  };
}