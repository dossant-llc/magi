import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { InstanceManager } from './InstanceManager.js';
import { MessageRouter } from './MessageRouter.js';
import { FlowTracker } from '../bridge/FlowTracker.js';
export class BrainNetwork extends EventEmitter {
    docker;
    instanceManager;
    messageRouter;
    flowTracker;
    instances = new Map();
    activeFlows = new Map();
    config;
    constructor(config) {
        super();
        this.config = config;
        this.docker = new Docker();
        this.instanceManager = new InstanceManager(this.docker, config);
        this.messageRouter = new MessageRouter();
        this.flowTracker = new FlowTracker();
        this.setupEventHandlers();
        // Auto-discover existing instances on startup
        this.initialize();
    }
    async initialize() {
        try {
            console.log('🚀 Initializing BrainNetwork...');
            const discovered = await this.discoverExistingInstances();
            console.log(`✅ Auto-discovered ${discovered.length} existing brain instances`);
        }
        catch (error) {
            console.error('⚠️  Auto-discovery failed on startup:', error);
        }
    }
    setupEventHandlers() {
        // Instance events
        this.instanceManager.on('instance_created', (instance) => {
            this.instances.set(instance.name, instance);
            this.emit('network_event', {
                type: 'instance_created',
                timestamp: new Date(),
                instanceName: instance.name,
                data: { instance }
            });
        });
        this.instanceManager.on('instance_started', (instance) => {
            instance.status = 'running';
            instance.lastActivity = new Date();
            this.emit('network_event', {
                type: 'instance_started',
                timestamp: new Date(),
                instanceName: instance.name,
                data: { instance }
            });
        });
        this.instanceManager.on('instance_stopped', (instance) => {
            instance.status = 'stopped';
            this.emit('network_event', {
                type: 'instance_stopped',
                timestamp: new Date(),
                instanceName: instance.name,
                data: { instance }
            });
        });
        // Message flow events
        this.flowTracker.on('message_sent', (flow) => {
            this.activeFlows.set(flow.id, flow);
            this.emit('network_event', {
                type: 'message_sent',
                timestamp: new Date(),
                messageId: flow.id,
                data: { flow }
            });
        });
        this.flowTracker.on('message_received', (flow) => {
            this.activeFlows.set(flow.id, flow);
            this.emit('network_event', {
                type: 'message_received',
                timestamp: new Date(),
                messageId: flow.id,
                data: { flow }
            });
        });
    }
    // Instance Management
    async spawnInstance(request) {
        console.log(`🧠 Spawning brain instance: ${request.name}`);
        // Validate instance name
        if (this.instances.has(request.name)) {
            throw new Error(`Instance '${request.name}' already exists`);
        }
        // Create memories directory if needed
        const memoriesPath = request.memoriesPath || path.join(this.config.memoriesBasePath, `memories.${request.name}`);
        if (!fs.existsSync(memoriesPath)) {
            fs.mkdirSync(memoriesPath, { recursive: true });
            console.log(`📁 Created memories directory: ${memoriesPath}`);
        }
        // Create instance configuration
        const instanceConfig = {
            ...this.config.defaultInstanceConfig,
            ...request.config,
            ollamaPort: await this.findAvailablePort(),
            environment: {
                NODE_ENV: 'production',
                MEMORIES_DIR: '/app/memories',
                LOG_FILE: `/app/logs/brainbridge-${request.name}.log`,
                INSTANCE_NAME: request.name,
                TRACE_MODE: 'true',
                ...request.config?.environment
            }
        };
        const instance = await this.instanceManager.createInstance(request.name, instanceConfig, memoriesPath);
        return instance;
    }
    async destroyInstance(name) {
        console.log(`🗑️  Destroying brain instance: ${name}`);
        const instance = this.instances.get(name);
        if (!instance) {
            throw new Error(`Instance '${name}' not found`);
        }
        await this.instanceManager.destroyInstance(name);
        this.instances.delete(name);
        console.log(`✅ Instance '${name}' destroyed`);
    }
    async startInstance(name) {
        const instance = this.instances.get(name);
        if (!instance) {
            throw new Error(`Instance '${name}' not found`);
        }
        await this.instanceManager.startInstance(instance);
    }
    async stopInstance(name) {
        const instance = this.instances.get(name);
        if (!instance) {
            throw new Error(`Instance '${name}' not found`);
        }
        await this.instanceManager.stopInstance(instance);
    }
    async restartInstance(name) {
        console.log(`🔄 Restarting brain instance: ${name}`);
        await this.stopInstance(name);
        await this.startInstance(name);
    }
    async listInstances() {
        // Refresh instance status from Docker
        for (const instance of this.instances.values()) {
            await this.instanceManager.refreshInstanceStatus(instance);
        }
        return Array.from(this.instances.values());
    }
    // Message Routing
    async sendMessage(request) {
        const { from, to, query, trackFlow = true } = request;
        console.log(`💬 Sending message from ${from} to ${to}: "${query.substring(0, 50)}..."`);
        // Validate instances exist
        if (!this.instances.has(from)) {
            throw new Error(`Source instance '${from}' not found`);
        }
        const targets = Array.isArray(to) ? to : [to];
        for (const target of targets) {
            if (!this.instances.has(target)) {
                throw new Error(`Target instance '${target}' not found`);
            }
        }
        // Create message flow
        const flow = {
            id: uuidv4(),
            from,
            to,
            query,
            timestamp: new Date(),
            status: 'pending',
            path: []
        };
        if (trackFlow) {
            this.activeFlows.set(flow.id, flow);
        }
        // Route message through MessageRouter
        const result = await this.messageRouter.routeMessage(flow, this.instances);
        return result;
    }
    async broadcastQuery(from, query) {
        console.log(`📢 Broadcasting query from ${from}: "${query}"`);
        const otherInstances = Array.from(this.instances.keys()).filter(name => name !== from);
        const flows = [];
        for (const target of otherInstances) {
            const flow = await this.sendMessage({ from, to: target, query });
            flows.push(flow);
        }
        return flows;
    }
    async sendToBrainInstance(request) {
        const { target, query, trackFlow = true } = request;
        console.log(`💬 Sending message to ${target}: "${query.substring(0, 50)}..."`);
        const instance = this.instances.get(target);
        if (!instance) {
            throw new Error(`Instance ${target} not found`);
        }
        if (instance.status !== 'running') {
            throw new Error(`Instance ${target} is not running`);
        }
        // Create flow tracking
        const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const flow = {
            id: flowId,
            from: 'orchestrator',
            to: target,
            query,
            status: 'pending',
            timestamp: new Date(),
            path: [{
                    instance: 'orchestrator',
                    action: 'initiated',
                    timestamp: new Date(),
                    metadata: { flowId, messageType: 'direct_message' }
                }]
        };
        if (trackFlow) {
            this.flowTracker.trackFlow(flow);
        }
        try {
            // Send message directly to the brain instance's MCP interface
            const response = await this.messageRouter.sendDirectMessage(instance, query, this.instances);
            // Update flow with response
            this.flowTracker.addHop(flowId, {
                instance: target,
                action: 'responded',
                timestamp: new Date(),
                metadata: { response: response.substring(0, 200) + '...' }
            });
            this.flowTracker.updateFlow(flowId, {
                status: 'completed',
                duration: Date.now() - flow.timestamp.getTime(),
                response
            });
            console.log(`✅ ${target} responded (${response.length} chars)`);
        }
        catch (error) {
            this.flowTracker.updateFlow(flowId, {
                status: 'error',
                error: error.message
            });
            throw error;
        }
        return flow;
    }
    async sendToBrainXchange(request) {
        const { from, query, trackFlow = true } = request;
        console.log(`📡 Sending message from ${from} to BrainXchange network`);
        const instance = this.instances.get(from);
        if (!instance) {
            throw new Error(`Instance ${from} not found`);
        }
        if (instance.status !== 'running') {
            throw new Error(`Instance ${from} is not running`);
        }
        // Create flow tracking
        const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const flow = {
            id: flowId,
            from,
            to: 'brainxchange',
            query,
            status: 'pending',
            timestamp: new Date(),
            path: [{
                    instance: from,
                    action: 'initiated',
                    timestamp: new Date(),
                    metadata: { flowId, messageType: 'brainxchange_query' }
                }]
        };
        if (trackFlow) {
            this.flowTracker.trackFlow(flow);
        }
        try {
            // Send query using the instance's MCP endpoint
            const response = await this.messageRouter.sendToBrainXchange(instance, query);
            // Update flow with response
            this.flowTracker.addHop(flowId, {
                instance: 'brainxchange',
                action: 'responded',
                timestamp: new Date(),
                metadata: { response: response.substring(0, 200) + '...' }
            });
            this.flowTracker.updateFlow(flowId, {
                status: 'completed',
                duration: Date.now() - flow.timestamp.getTime(),
                response
            });
            console.log(`✅ BrainXchange response received (${response.length} chars)`);
        }
        catch (error) {
            this.flowTracker.updateFlow(flowId, {
                status: 'error',
                error: error.message
            });
            throw error;
        }
        return flow;
    }
    // Network Analysis
    async getNetworkTopology() {
        const instances = await this.listInstances();
        const connections = this.messageRouter.getConnections();
        const messageFlows = Array.from(this.activeFlows.values());
        const stats = {
            totalInstances: instances.length,
            activeInstances: instances.filter(i => i.status === 'running').length,
            totalMessages: messageFlows.length,
            avgResponseTime: this.calculateAverageResponseTime(messageFlows),
            errorRate: this.calculateErrorRate(messageFlows),
            uptime: this.calculateNetworkUptime(instances)
        };
        return {
            instances,
            connections,
            messageFlows,
            stats
        };
    }
    async visualizeFlow(messageId) {
        const flow = this.activeFlows.get(messageId);
        if (!flow) {
            return null;
        }
        // Enhance flow with visualization data
        return this.flowTracker.getFlowVisualization(flow);
    }
    // Utility Methods
    async findAvailablePort() {
        // Start from 11434 and find next available port
        let port = 11434;
        const usedPorts = Array.from(this.instances.values()).map(i => i.config.ollamaPort);
        while (usedPorts.includes(port)) {
            port++;
        }
        return port;
    }
    calculateAverageResponseTime(flows) {
        const completedFlows = flows.filter(f => f.status === 'completed' && f.duration);
        if (completedFlows.length === 0)
            return 0;
        const totalTime = completedFlows.reduce((sum, f) => sum + (f.duration || 0), 0);
        return Math.round(totalTime / completedFlows.length);
    }
    calculateErrorRate(flows) {
        if (flows.length === 0)
            return 0;
        const errorFlows = flows.filter(f => f.status === 'error');
        return Math.round((errorFlows.length / flows.length) * 100);
    }
    calculateNetworkUptime(instances) {
        if (instances.length === 0)
            return 0;
        const totalUptime = instances.reduce((sum, i) => sum + i.stats.uptime, 0);
        return Math.round(totalUptime / instances.length);
    }
    // Discovery - Auto-detect existing instances
    async discoverExistingInstances() {
        console.log('🔍 Discovering existing BrainBridge instances...');
        const containers = await this.docker.listContainers({ all: true });
        const brainbridgeContainers = containers.filter(container => {
            // Only include containers that look like actual brain instances
            const name = container.Names[0] || '';
            return name.includes('brainbridge') &&
                !name.includes('ollama') && // Exclude Ollama service containers
                container.Image &&
                (container.Image.includes('brainbridge') || container.Image.includes('node'));
        });
        const discoveredInstances = [];
        for (const containerInfo of brainbridgeContainers) {
            try {
                const instance = await this.instanceManager.importExistingInstance(containerInfo);
                this.instances.set(instance.name, instance);
                discoveredInstances.push(instance);
                console.log(`✅ Discovered instance: ${instance.name} (${instance.status})`);
            }
            catch (error) {
                console.warn(`⚠️  Failed to import container ${containerInfo.Names[0]}:`, error);
            }
        }
        console.log(`🎉 Discovered ${discoveredInstances.length} existing instances`);
        return discoveredInstances;
    }
    // Health Check
    async performHealthCheck() {
        const issues = [];
        let healthy = true;
        try {
            // Check Docker daemon
            await this.docker.ping();
        }
        catch (error) {
            issues.push('Docker daemon not accessible');
            healthy = false;
        }
        // Check instances
        const instances = await this.listInstances();
        for (const instance of instances) {
            if (instance.status === 'error') {
                issues.push(`Instance '${instance.name}' has errors`);
                healthy = false;
            }
        }
        // Check message flows
        const stalledFlows = Array.from(this.activeFlows.values()).filter(flow => flow.status === 'pending' &&
            Date.now() - flow.timestamp.getTime() > 30000 // 30 seconds
        );
        if (stalledFlows.length > 0) {
            issues.push(`${stalledFlows.length} message flows are stalled`);
            healthy = false;
        }
        return { healthy, issues };
    }
    // Cleanup
    async cleanup() {
        console.log('🧹 Cleaning up BrainNetwork...');
        // Clear active flows
        this.activeFlows.clear();
        // Remove all event listeners
        this.removeAllListeners();
        console.log('✅ BrainNetwork cleanup complete');
    }
}
