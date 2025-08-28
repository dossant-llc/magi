import { EventEmitter } from 'events';
import { MessageFlow, MessageHop } from '../types/index.js';

export class FlowTracker extends EventEmitter {
  private flows: Map<string, MessageFlow> = new Map();
  private flowHistory: MessageFlow[] = [];
  private maxHistorySize: number = 1000;

  trackFlow(flow: MessageFlow): void {
    this.flows.set(flow.id, flow);
    this.emit('flow_started', flow);
    
    console.log(`🎯 Tracking message flow: ${flow.id} (${flow.from} → ${flow.to})`);
  }

  updateFlow(flowId: string, updates: Partial<MessageFlow>): MessageFlow | null {
    const flow = this.flows.get(flowId);
    if (!flow) {
      console.warn(`⚠️  Flow ${flowId} not found for update`);
      return null;
    }

    // Update flow properties
    Object.assign(flow, updates);
    
    // Emit appropriate events based on status changes
    if (updates.status === 'completed') {
      this.emit('flow_completed', flow);
      this.archiveFlow(flow);
    } else if (updates.status === 'error') {
      this.emit('flow_failed', flow);
      this.archiveFlow(flow);
    }

    this.emit('flow_updated', flow);
    return flow;
  }

  addHop(flowId: string, hop: MessageHop): MessageFlow | null {
    const flow = this.flows.get(flowId);
    if (!flow) {
      console.warn(`⚠️  Flow ${flowId} not found for hop`);
      return null;
    }

    flow.path.push(hop);
    this.emit('hop_added', { flow, hop });
    
    return flow;
  }

  getFlow(flowId: string): MessageFlow | null {
    return this.flows.get(flowId) || null;
  }

  getActiveFlows(): MessageFlow[] {
    return Array.from(this.flows.values()).filter(
      flow => flow.status === 'pending' || flow.status === 'routing' || flow.status === 'processing'
    );
  }

  getFlowHistory(limit: number = 100): MessageFlow[] {
    return this.flowHistory.slice(-limit);
  }

  getFlowVisualization(flow: MessageFlow): MessageFlow {
    // Enhance flow with visualization metadata
    const enhancedFlow = { ...flow };
    
    // Calculate timing information for each hop
    enhancedFlow.path = flow.path.map((hop, index) => {
      const nextHop = flow.path[index + 1];
      const duration = nextHop 
        ? nextHop.timestamp.getTime() - hop.timestamp.getTime()
        : undefined;

      return {
        ...hop,
        duration,
        metadata: {
          ...hop.metadata,
          visualIndex: index,
          isFirstHop: index === 0,
          isLastHop: index === flow.path.length - 1,
          hopDuration: duration
        }
      };
    });

    // Add flow-level visualization metadata
    enhancedFlow.path.forEach(hop => {
      if (!hop.metadata) hop.metadata = {};
      hop.metadata.flowId = flow.id;
      hop.metadata.totalHops = flow.path.length;
    });

    return enhancedFlow;
  }

  // Analytics Methods
  getFlowStats(timeWindowMs: number = 3600000): {
    totalFlows: number;
    completedFlows: number;
    errorFlows: number;
    avgDuration: number;
    successRate: number;
  } {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentFlows = this.flowHistory.filter(flow => flow.timestamp >= cutoff);
    
    const completedFlows = recentFlows.filter(f => f.status === 'completed');
    const errorFlows = recentFlows.filter(f => f.status === 'error');
    
    const avgDuration = completedFlows.length > 0
      ? completedFlows.reduce((sum, f) => sum + (f.duration || 0), 0) / completedFlows.length
      : 0;

    const successRate = recentFlows.length > 0
      ? (completedFlows.length / recentFlows.length) * 100
      : 0;

    return {
      totalFlows: recentFlows.length,
      completedFlows: completedFlows.length,
      errorFlows: errorFlows.length,
      avgDuration: Math.round(avgDuration),
      successRate: Math.round(successRate * 100) / 100
    };
  }

  getInstanceFlowStats(instanceName: string): {
    sent: number;
    received: number;
    avgResponseTime: number;
  } {
    const sent = this.flowHistory.filter(f => f.from === instanceName).length;
    const received = this.flowHistory.filter(f => {
      const targets = Array.isArray(f.to) ? f.to : [f.to];
      return targets.includes(instanceName);
    }).length;

    const instanceFlows = this.flowHistory.filter(f => 
      f.from === instanceName && f.status === 'completed' && f.duration
    );
    
    const avgResponseTime = instanceFlows.length > 0
      ? instanceFlows.reduce((sum, f) => sum + (f.duration || 0), 0) / instanceFlows.length
      : 0;

    return {
      sent,
      received,
      avgResponseTime: Math.round(avgResponseTime)
    };
  }

  // Flow Pattern Analysis
  getCommonFlowPatterns(limit: number = 10): Array<{
    pattern: string;
    count: number;
    avgDuration: number;
    successRate: number;
  }> {
    const patterns = new Map<string, {
      flows: MessageFlow[];
      count: number;
      successCount: number;
      totalDuration: number;
    }>();

    // Analyze flow patterns
    this.flowHistory.forEach(flow => {
      const targets = Array.isArray(flow.to) ? flow.to : [flow.to];
      const pattern = `${flow.from} → ${targets.join(', ')}`;
      
      const existing = patterns.get(pattern) || {
        flows: [],
        count: 0,
        successCount: 0,
        totalDuration: 0
      };

      existing.flows.push(flow);
      existing.count++;
      
      if (flow.status === 'completed') {
        existing.successCount++;
        existing.totalDuration += flow.duration || 0;
      }

      patterns.set(pattern, existing);
    });

    // Convert to sorted result
    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        avgDuration: data.successCount > 0 
          ? Math.round(data.totalDuration / data.successCount)
          : 0,
        successRate: Math.round((data.successCount / data.count) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Cleanup Methods
  private archiveFlow(flow: MessageFlow): void {
    // Move to history
    this.flowHistory.push({ ...flow });
    
    // Remove from active flows
    this.flows.delete(flow.id);
    
    // Maintain history size limit
    if (this.flowHistory.length > this.maxHistorySize) {
      this.flowHistory = this.flowHistory.slice(-this.maxHistorySize);
    }

    console.log(`📦 Archived flow: ${flow.id} (${flow.status})`);
  }

  cleanupStaleFlows(maxAgeMs: number = 300000): number { // 5 minutes default
    const cutoff = new Date(Date.now() - maxAgeMs);
    let cleaned = 0;

    for (const [flowId, flow] of this.flows.entries()) {
      if (flow.timestamp < cutoff && 
          (flow.status === 'pending' || flow.status === 'routing')) {
        // Mark as timed out and archive
        flow.status = 'error';
        flow.error = 'Flow timed out';
        this.archiveFlow(flow);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale flows`);
    }

    return cleaned;
  }

  // Visualization Helpers
  generateFlowPath(flow: MessageFlow): Array<{
    step: number;
    instance: string;
    action: string;
    timestamp: Date;
    duration?: number;
    coordinates?: { x: number; y: number };
  }> {
    return flow.path.map((hop, index) => ({
      step: index + 1,
      instance: hop.instance,
      action: hop.action,
      timestamp: hop.timestamp,
      duration: hop.duration,
      coordinates: hop.metadata?.coordinates
    }));
  }

  getFlowMetrics(): {
    activeFlows: number;
    totalFlowsToday: number;
    avgFlowDuration: number;
    flowThroughput: number; // flows per minute
  } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayFlows = this.flowHistory.filter(f => f.timestamp >= todayStart);
    const completedToday = todayFlows.filter(f => f.status === 'completed' && f.duration);
    
    const avgDuration = completedToday.length > 0
      ? completedToday.reduce((sum, f) => sum + (f.duration || 0), 0) / completedToday.length
      : 0;

    // Calculate throughput over last hour
    const hourAgo = new Date(Date.now() - 3600000);
    const lastHourFlows = this.flowHistory.filter(f => f.timestamp >= hourAgo);
    const throughput = lastHourFlows.length / 60; // per minute

    return {
      activeFlows: this.flows.size,
      totalFlowsToday: todayFlows.length,
      avgFlowDuration: Math.round(avgDuration),
      flowThroughput: Math.round(throughput * 100) / 100
    };
  }

  // Reset and maintenance
  reset(): void {
    this.flows.clear();
    this.flowHistory = [];
    console.log('🔄 FlowTracker reset');
  }
}