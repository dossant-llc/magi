import Docker from 'dockerode';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import {
  BrainInstance,
  InstanceConfig,
  InstanceStats,
  BrainNetworkConfig,
  DockerContainerInfo
} from '../types/index.js';

export class InstanceManager extends EventEmitter {
  private docker: Docker;
  private config: BrainNetworkConfig;

  constructor(docker: Docker, config: BrainNetworkConfig) {
    super();
    this.docker = docker;
    this.config = config;
  }

  async createInstance(name: string, config: InstanceConfig, memoriesPath: string): Promise<BrainInstance> {
    console.log(`🏗️  Creating Docker container for instance: ${name}`);

    const containerName = `brainbridge-${name}`;
    const ollamaContainerName = `brainbridge-ollama-${name}`;

    // Create Docker Compose configuration for this instance
    const composeConfig = this.generateComposeConfig(name, config, memoriesPath);
    const composeFile = path.join(this.config.brainbridgePath, `docker-compose.${name}.yml`);
    
    fs.writeFileSync(composeFile, composeConfig);
    console.log(`📝 Created docker-compose file: ${composeFile}`);

    // Build and start containers using docker-compose
    const execAsync = promisify(exec);
    const composeCommand = `cd ${this.config.brainbridgePath} && docker-compose -f docker-compose.${name}.yml up -d --build`;
    
    try {
      const { stdout, stderr } = await execAsync(composeCommand);
      console.log(`✅ Container created: ${stdout}`);
      if (stderr) console.log(`Docker info: ${stderr}`);
    } catch (error) {
      console.error(`Docker compose failed: ${error}`);
      throw error;
    }

    // Wait for container to be ready
    await this.waitForContainer(containerName);

    const instance: BrainInstance = {
      name,
      containerName,
      memoriesPath,
      mcpEndpoint: `http://localhost:${this.getHttpPort(name)}`,
      status: 'running',
      created: new Date(),
      lastActivity: new Date(),
      config,
      stats: {
        memoryFiles: 0,
        totalQueries: 0,
        avgResponseTime: 0,
        uptime: 0
      }
    };

    // Update container ID
    try {
      const container = this.docker.getContainer(containerName);
      const containerInfo = await container.inspect();
      instance.containerId = containerInfo.Id;
    } catch (error) {
      console.warn(`Could not get container ID for ${containerName}`);
    }

    this.emit('instance_created', instance);
    return instance;
  }

  async destroyInstance(name: string): Promise<void> {
    const containerName = `brainbridge-${name}`;
    const composeFile = path.join(this.config.brainbridgePath, `docker-compose.${name}.yml`);

    // Stop and remove containers using docker-compose
    const execAsync = promisify(exec);
    const composeCommand = `cd ${this.config.brainbridgePath} && docker-compose -f docker-compose.${name}.yml down -v`;
    
    try {
      await execAsync(composeCommand);
    } catch (error) {
      console.error(`Docker compose down failed: ${error}`);
      // Continue anyway - might be already stopped
    }

    // Clean up compose file
    if (fs.existsSync(composeFile)) {
      fs.unlinkSync(composeFile);
      console.log(`🗑️  Removed compose file: ${composeFile}`);
    }
  }

  async startInstance(instance: BrainInstance): Promise<void> {
    console.log(`▶️  Starting instance: ${instance.name}`);
    
    const composeCommand = `cd ${this.config.brainbridgePath} && docker-compose -f docker-compose.${instance.name}.yml start`;
    const execAsync = promisify(exec);
    
    try {
      await execAsync(composeCommand);
    } catch (error) {
      throw error;
    }

    instance.status = 'running';
    instance.lastActivity = new Date();
    this.emit('instance_started', instance);
  }

  async stopInstance(instance: BrainInstance): Promise<void> {
    console.log(`⏸️  Stopping instance: ${instance.name}`);
    
    const composeCommand = `cd ${this.config.brainbridgePath} && docker-compose -f docker-compose.${instance.name}.yml stop`;
    const execAsync = promisify(exec);
    
    try {
      await execAsync(composeCommand);
    } catch (error) {
      throw error;
    }

    instance.status = 'stopped';
    this.emit('instance_stopped', instance);
  }

  async refreshInstanceStatus(instance: BrainInstance): Promise<void> {
    if (!instance.containerId) {
      return;
    }

    try {
      const container = this.docker.getContainer(instance.containerId);
      const containerInfo = await container.inspect();
      
      instance.status = containerInfo.State.Running ? 'running' : 'stopped';
      
      // Update stats
      instance.stats.uptime = containerInfo.State.Running 
        ? Date.now() - new Date(containerInfo.State.StartedAt).getTime()
        : 0;

      // Get memory file count
      const memoriesPath = instance.memoriesPath;
      if (fs.existsSync(memoriesPath)) {
        const files = this.countMemoryFiles(memoriesPath);
        instance.stats.memoryFiles = files;
      }

    } catch (error) {
      console.warn(`Failed to refresh status for ${instance.name}:`, error);
      instance.status = 'error';
    }
  }

  async importExistingInstance(containerInfo: any): Promise<BrainInstance> {
    const containerName = containerInfo.Names[0].replace('/', '');
    
    // Extract instance name from container name
    const nameMatch = containerName.match(/brainbridge-(.+)/);
    if (!nameMatch) {
      throw new Error(`Cannot extract instance name from container: ${containerName}`);
    }
    
    const instanceName = nameMatch[1];
    
    // Get container details
    const container = this.docker.getContainer(containerInfo.Id);
    const details = await container.inspect();

    // Extract memories path from mounts
    const memoriesMount = details.Mounts?.find((mount: any) => 
      mount.Destination === '/app/memories'
    );
    
    const memoriesPath = memoriesMount?.Source || path.join(this.config.memoriesBasePath, `memories.${instanceName}`);

    // Extract configuration from environment
    const env = details.Config?.Env || [];
    const envMap = new Map();
    env.forEach((envVar: string) => {
      const [key, value] = envVar.split('=');
      envMap.set(key, value);
    });

    const config: InstanceConfig = {
      ollamaPort: parseInt(envMap.get('OLLAMA_PORT') || '11434'),
      environment: Object.fromEntries(envMap)
    };

    const instance: BrainInstance = {
      name: instanceName,
      containerId: containerInfo.Id,
      containerName,
      memoriesPath,
      mcpEndpoint: `http://localhost:${this.getHttpPort(instanceName)}`,
      status: containerInfo.State === 'running' ? 'running' : 'stopped',
      created: new Date(details.Created),
      lastActivity: details.State?.StartedAt ? new Date(details.State.StartedAt) : undefined,
      config,
      stats: {
        memoryFiles: this.countMemoryFiles(memoriesPath),
        totalQueries: 0,
        avgResponseTime: 0,
        uptime: containerInfo.State === 'running' 
          ? Date.now() - new Date(details.State.StartedAt).getTime()
          : 0
      }
    };

    return instance;
  }

  private generateComposeConfig(name: string, config: InstanceConfig, memoriesPath: string): string {
    const relativePath = path.relative(this.config.brainbridgePath, memoriesPath);
    
    return `version: '3.8'

services:
  brainbridge-${name}:
    build: .
    container_name: brainbridge-${name}
    volumes:
      # Mount instance-specific memories directory
      - ${relativePath}:/app/memories
      # Mount logs directory
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
      - LOG_FILE=/app/logs/brainbridge-${name}.log
      - INSTANCE_NAME=${name}
      - TRACE_MODE=true
      - OLLAMA_HOST=brainbridge-ollama
      - OLLAMA_PORT=11434
      ${Object.entries(config.environment || {})
        .map(([key, value]) => `      - ${key}=${value}`)
        .join('\n')}
    stdin_open: true
    tty: true
    restart: unless-stopped
    networks:
      - brainbridge-shared-net

networks:
  brainbridge-shared-net:
    external: true
    name: brainbridge_brainbridge-net
`;
  }

  private async waitForContainer(containerName: string, timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const container = this.docker.getContainer(containerName);
        const info = await container.inspect();
        
        if (info.State.Running && info.State.Health?.Status !== 'starting') {
          console.log(`✅ Container ${containerName} is ready`);
          return;
        }
      } catch (error) {
        // Container might not exist yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Timeout waiting for container ${containerName} to be ready`);
  }

  private countMemoryFiles(memoriesPath: string): number {
    if (!fs.existsSync(memoriesPath)) {
      return 0;
    }
    
    let count = 0;
    const countFiles = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          countFiles(path.join(dir, entry.name));
        } else if (entry.name.endsWith('.md')) {
          count++;
        }
      }
    };
    
    countFiles(memoriesPath);
    return count;
  }

  async getInstanceLogs(instance: BrainInstance, lines: number = 100): Promise<string[]> {
    if (!instance.containerId) {
      return [];
    }

    try {
      const container = this.docker.getContainer(instance.containerId);
      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true
      });
      
      // Parse Docker logs format
      const logs = logStream.toString().split('\n').filter(line => line.trim());
      return logs;
    } catch (error) {
      console.error(`Failed to get logs for ${instance.name}:`, error);
      return [];
    }
  }

  private getHttpPort(instanceName: string): number {
    // Map instance names to their HTTP ports
    const portMap: Record<string, number> = {
      'alice': 8147,
      'bob': 8148,
      'carol': 8149,
      'default': 8150,
      'mcp': 8151,
      'knor': 8152
    };
    
    return portMap[instanceName] || 8150;
  }
}