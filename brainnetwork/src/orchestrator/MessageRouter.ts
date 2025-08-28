import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

import {
  BrainInstance,
  MessageFlow,
  MessageHop,
  Connection
} from '../types/index.js';

const execAsync = promisify(exec);

export class MessageRouter extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private routingStats: Map<string, { sent: number; received: number; errors: number }> = new Map();

  async routeMessage(flow: MessageFlow, instances: Map<string, BrainInstance>): Promise<MessageFlow> {
    const startTime = Date.now();
    flow.status = 'routing';

    try {
      // Add routing hop
      this.addHop(flow, 'brainrouter', 'route', { action: 'start_routing' });

      const sourceInstance = instances.get(flow.from);
      if (!sourceInstance) {
        throw new Error(`Source instance '${flow.from}' not found`);
      }

      // Handle single target vs multiple targets
      const targets = Array.isArray(flow.to) ? flow.to : [flow.to];
      const responses: { target: string; response: string; error?: string }[] = [];

      for (const target of targets) {
        const targetInstance = instances.get(target);
        if (!targetInstance) {
          responses.push({ 
            target, 
            response: '', 
            error: `Target instance '${target}' not found` 
          });
          continue;
        }

        try {
          // Add processing hop for this target
          this.addHop(flow, target, 'process', { target });

          // Send query to target instance via MCP
          const response = await this.queryInstance(targetInstance, flow.query);
          responses.push({ target, response });

          // Update connection stats
          this.updateConnection(flow.from, target);
          this.updateRoutingStats(target, 'received');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          responses.push({ target, response: '', error: errorMessage });
          this.updateRoutingStats(target, 'errors');
        }
      }

      // Compile final response
      if (targets.length === 1) {
        // Single target response
        const result = responses[0];
        if (result.error) {
          flow.status = 'error';
          flow.error = result.error;
        } else {
          flow.status = 'completed';
          flow.response = result.response;
        }
      } else {
        // Multiple target responses
        flow.status = 'completed';
        flow.response = this.formatMultiTargetResponse(responses);
      }

      flow.duration = Date.now() - startTime;
      this.addHop(flow, 'brainrouter', 'route', { 
        action: 'routing_complete', 
        duration: flow.duration,
        targets: targets.length
      });

      // Update routing stats
      this.updateRoutingStats(flow.from, 'sent');

      console.log(`📬 Message routed: ${flow.from} → ${targets.join(', ')} (${flow.duration}ms)`);
      
      this.emit('message_routed', flow);
      return flow;

    } catch (error) {
      flow.status = 'error';
      flow.error = error instanceof Error ? error.message : String(error);
      flow.duration = Date.now() - startTime;

      this.addHop(flow, 'brainrouter', 'route', { 
        action: 'routing_failed', 
        error: flow.error,
        duration: flow.duration
      });

      console.error(`❌ Message routing failed: ${flow.error}`);
      this.emit('message_error', flow);
      return flow;
    }
  }

  private async queryInstance(instance: BrainInstance, query: string): Promise<string> {
    console.log(`🤖 Querying ${instance.name}: "${query.substring(0, 50)}..."`);

    // Prepare MCP query
    const mcpQuery = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "ai_query_memories",
        arguments: {
          question: query,
          limit: 5,
          synthesis_mode: "raw"
        }
      }
    };

    try {
      // Execute query via docker exec
      const command = `echo '${JSON.stringify(mcpQuery)}' | ${instance.mcpEndpoint}`;
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr && stderr.includes('error')) {
        throw new Error(`Instance error: ${stderr}`);
      }

      // Parse MCP response
      const lines = stdout.split('\n').filter(line => line.trim());
      let mcpResponse = null;

      // Find the JSON response line (ignore log output)
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.jsonrpc && parsed.id === 1) {
            mcpResponse = parsed;
            break;
          }
        } catch (e) {
          // Skip non-JSON lines (logs)
          continue;
        }
      }

      if (!mcpResponse) {
        throw new Error('No valid MCP response found');
      }

      if (mcpResponse.error) {
        throw new Error(`MCP error: ${mcpResponse.error.message}`);
      }

      // Extract response content
      const content = mcpResponse.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No response content received');
      }

      console.log(`✅ Response from ${instance.name}: ${content.length} characters`);
      return content;

    } catch (error) {
      console.error(`❌ Failed to query ${instance.name}:`, error);
      throw error;
    }
  }

  private formatMultiTargetResponse(responses: { target: string; response: string; error?: string }[]): string {
    let formatted = `📊 **Multi-Brain Response Summary**\n\n`;
    
    for (const result of responses) {
      formatted += `## 🧠 ${result.target}\n`;
      if (result.error) {
        formatted += `❌ **Error**: ${result.error}\n\n`;
      } else {
        formatted += `${result.response}\n\n`;
      }
      formatted += `---\n\n`;
    }

    const successCount = responses.filter(r => !r.error).length;
    const errorCount = responses.filter(r => r.error).length;
    
    formatted += `📈 **Results**: ${successCount} successful, ${errorCount} errors`;
    return formatted;
  }

  private addHop(flow: MessageFlow, instance: string, action: 'send' | 'receive' | 'process' | 'route', metadata?: any): void {
    const hop: MessageHop = {
      instance,
      timestamp: new Date(),
      action,
      ...(metadata && { metadata })
    };

    flow.path.push(hop);
  }

  private updateConnection(from: string, to: string): void {
    const connectionKey = `${from}->${to}`;
    const existing = this.connections.get(connectionKey);

    if (existing) {
      existing.messageCount++;
      existing.lastUsed = new Date();
      existing.status = 'active';
    } else {
      this.connections.set(connectionKey, {
        from,
        to,
        type: 'local',
        status: 'active',
        lastUsed: new Date(),
        messageCount: 1
      });
    }
  }

  private updateRoutingStats(instance: string, type: 'sent' | 'received' | 'errors'): void {
    const existing = this.routingStats.get(instance) || { sent: 0, received: 0, errors: 0 };
    existing[type]++;
    this.routingStats.set(instance, existing);
  }

  // Public methods for network analysis
  getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getRoutingStats(): Map<string, { sent: number; received: number; errors: number }> {
    return new Map(this.routingStats);
  }

  getConnectionBetween(from: string, to: string): Connection | null {
    return this.connections.get(`${from}->${to}`) || null;
  }

  // Network topology analysis
  getMostActiveConnections(limit: number = 10): Connection[] {
    return Array.from(this.connections.values())
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit);
  }

  getInstanceNetworkRank(instance: string): { sent: number; received: number; total: number; rank: number } {
    const stats = this.routingStats.get(instance) || { sent: 0, received: 0, errors: 0 };
    const total = stats.sent + stats.received;
    
    // Calculate rank compared to other instances
    const allTotals = Array.from(this.routingStats.values()).map(s => s.sent + s.received);
    const betterThan = allTotals.filter(t => t < total).length;
    const rank = betterThan + 1;

    return {
      sent: stats.sent,
      received: stats.received,
      total,
      rank
    };
  }

  // Cleanup stale connections
  cleanupStaleConnections(maxAgeMs: number = 3600000): number { // 1 hour default
    const cutoff = new Date(Date.now() - maxAgeMs);
    let cleaned = 0;

    for (const [key, connection] of this.connections.entries()) {
      if (connection.lastUsed && connection.lastUsed < cutoff) {
        this.connections.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale connections`);
    }

    return cleaned;
  }

  async sendDirectMessage(instance: BrainInstance, query: string, allInstances: Map<string, BrainInstance>): Promise<string> {
    console.log(`💬 Sending direct message to ${instance.name}`);
    
    try {
      // Auto-detect intent: query vs save
      const intent = this.detectMessageIntent(query);
      console.log(`🎯 Detected intent: ${intent} for "${query.substring(0, 50)}..."`);
      
      // Check if this is a query about someone else
      if (intent === 'query') {
        const crossBrainTarget = this.detectCrossBrainQuery(query, allInstances);
        if (crossBrainTarget && crossBrainTarget !== instance.name) {
          console.log(`🔄 Cross-brain query detected: routing to ${crossBrainTarget} instead of ${instance.name}`);
          const targetInstance = allInstances.get(crossBrainTarget);
          if (targetInstance) {
            // Route to the target brain directly
            return await this.sendDirectMessage(targetInstance, query, allInstances);
          }
        }
      }
      
      let mcpQuery;
      if (intent === 'query') {
        // Use search_memories for questions (fallback when AI unavailable)
        mcpQuery = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "ai_query_memories",
            arguments: {
              question: query.replace(/^magi,?\s*/i, '').trim()
            }
          }
        };
      } else {
        // Use add_memory for statements/memories (fallback when AI categorization is unavailable)
        mcpQuery = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "add_memory",
            arguments: {
              title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
              content: query,
              category: "personal"
            }
          }
        };
      }
      
      const response = await this.sendMcpQuery(instance, JSON.stringify(mcpQuery));
      
      this.updateRoutingStats(instance.name, 'sent');
      console.log(`✅ Direct message completed to ${instance.name}`);
      
      return response;
      
    } catch (error) {
      this.updateRoutingStats(instance.name, 'errors');
      console.error(`❌ Direct message failed to ${instance.name}:`, error);
      throw error;
    }
  }

  async sendMcpQuery(instance: BrainInstance, queryData: string): Promise<string> {
    try {
      // Execute MCP query via HTTP POST to the persistent server
      const mcpQuery = JSON.parse(queryData);
      const httpEndpoint = `${instance.mcpEndpoint}/mcp`;
      
      console.log(`🔗 Making HTTP request to ${httpEndpoint}`);
      
      const response = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: queryData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const mcpResponse = await response.json();

      if (!mcpResponse) {
        throw new Error('No valid MCP response received');
      }

      if (mcpResponse.error) {
        const errorMsg = mcpResponse.error.message || mcpResponse.error;
        
        // FATAL ERROR: AI tools not available - do NOT fallback to inferior search
        if (errorMsg.includes('Unknown tool: ai_query_memories') || errorMsg.includes('ai_query_memories')) {
          throw new Error(`🚨 FATAL: AI-powered search is not available! This is a system failure - Ollama/AI services must be working for proper semantic search. Raw error: ${errorMsg}`);
        }
        
        throw new Error(`MCP Error: ${errorMsg}`);
      }

      return mcpResponse.result?.content || JSON.stringify(mcpResponse.result) || 'Command completed successfully';
      
    } catch (error) {
      console.error(`MCP query failed:`, error);
      throw error;
    }
  }

  async sendToBrainXchange(instance: BrainInstance, query: string): Promise<string> {
    console.log(`📡 Routing message from ${instance.name} to BrainXchange network`);
    
    try {
      // Use the instance's MCP connection to send query to BrainXchange
      const mcpQuery = {
        jsonrpc: "2.0",
        id: 1,
        method: 'tools/call',
        params: {
          name: 'ai_query_memories',
          arguments: {
            question: query,
            synthesis_mode: 'local'
          }
        }
      };
      
      const response = await this.sendMcpQuery(instance, JSON.stringify(mcpQuery));
      
      this.updateRoutingStats(instance.name, 'sent');
      console.log(`✅ BrainXchange query completed from ${instance.name}`);
      
      return response;
      
    } catch (error) {
      this.updateRoutingStats(instance.name, 'errors');
      console.error(`❌ BrainXchange query failed from ${instance.name}:`, error);
      throw error;
    }
  }

  // Cross-brain query detection - check if query is about someone else
  private detectCrossBrainQuery(query: string, allInstances: Map<string, BrainInstance>): string | null {
    const text = query.toLowerCase();
    
    // Extract potential brain names from the query
    const brainNames = Array.from(allInstances.keys()).map(name => name.toLowerCase());
    
    // Check for @mentions first (highest priority)
    const mentionMatch = text.match(/@(\w+)/);
    if (mentionMatch) {
      const mentionedName = mentionMatch[1].toLowerCase();
      if (brainNames.includes(mentionedName)) {
        console.log(`📝 Found @mention: ${mentionedName}`);
        return mentionedName;
      }
    }
    
    // Check for direct name references
    for (const brainName of brainNames) {
      // Look for patterns like "does alice like...", "what about bob...", "tell me about carol..."
      const namePatterns = [
        new RegExp(`\\b${brainName}\\b.*\\b(like|love|prefer|enjoy|think|know|remember)\\b`, 'i'),
        new RegExp(`\\b(does|did|can|will)\\s+${brainName}\\b`, 'i'),
        new RegExp(`\\b(what|how)\\s+.*\\b${brainName}\\b`, 'i'),
        new RegExp(`\\babout\\s+${brainName}\\b`, 'i'),
        new RegExp(`\\b${brainName}'s\\b`, 'i') // possessive form
      ];
      
      for (const pattern of namePatterns) {
        if (pattern.test(text)) {
          console.log(`📝 Found name reference: ${brainName} via pattern ${pattern.source}`);
          return brainName;
        }
      }
    }
    
    return null;
  }

  // Intent detection for message routing
  private detectMessageIntent(message: string): 'query' | 'save' {
    const text = message.toLowerCase().trim();
    
    // Question patterns - should use ai_query_memories
    const questionPatterns = [
      // Direct questions
      /^(what|who|when|where|why|how|which|whose)\b/,
      // Questions with auxiliary verbs
      /^(do|does|did|can|could|would|will|shall|should|is|are|was|were|has|have|had)\b/,
      // Questions ending with ?
      /\?$/,
      // Questions about others (with @ mentions)
      /@\w+/,
      // Query commands
      /^(tell me|show me|find|search|look up|what about)\b/,
      // Asking about knowledge
      /\b(know|remember|recall|think|believe)\b.*\?/
    ];
    
    // Memory/save patterns - will use add_memory (fallback when AI unavailable)  
    const savePatterns = [
      // Self-description
      /^(about me|my name is|i am|i'm|i like|i love|i hate|i prefer)\b/,
      // Direct memory commands
      /^(remember|save|store|keep|note|magi)\b/,
      // Factual statements
      /^(my .* is|i have|i own|i work|i live|i was born)\b/,
      // Biographical info
      /\b(expertise|favorite|fun fact|personality|skills)\b/
    ];
    
    // Check for query patterns first
    for (const pattern of questionPatterns) {
      if (pattern.test(text)) {
        return 'query';
      }
    }
    
    // Check for save patterns
    for (const pattern of savePatterns) {
      if (pattern.test(text)) {
        return 'save';
      }
    }
    
    // Default heuristics
    if (text.includes('?')) {
      return 'query';
    }
    
    if (text.startsWith('about me') || text.includes('i am') || text.includes("i'm")) {
      return 'save';
    }
    
    // Default to save for ambiguous cases (can be adjusted)
    return 'save';
  }

  // Reset stats
  resetStats(): void {
    this.routingStats.clear();
    this.connections.clear();
    console.log('📊 Routing statistics reset');
  }

  // Smart query cleaning for better search results
  private cleanSearchQuery(query: string): string {
    // Step 1: Remove magi wake word but preserve everything else initially
    let cleaned = query.replace(/^magi,?\s*/i, '').trim();
    
    // Step 2: Remove @mentions for search (they're used for routing, not content search)
    // The @mention has already done its job for routing, now we focus on content search
    cleaned = cleaned.replace(/@\w+\s*/g, '').trim();
    
    // Step 3: Remove conversational fluff but keep key search terms
    // Remove question words at start: "what is", "what are", "does", etc.
    cleaned = cleaned.replace(/^(what\s+(is|are|do|does|did|will|would|can|could)\s+)/gi, '');
    cleaned = cleaned.replace(/^(does|do|did|will|would|can|could)\s+/gi, '');
    
    // Step 4: Remove filler words but preserve core meaning
    // Remove words like "likes", "preferences" when they're not the main subject
    const fillerWords = /\b(likes?|preferences?|about|regarding|concerning|related to)\b/gi;
    cleaned = cleaned.replace(fillerWords, ' ');
    
    // Step 5: Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Step 6: Extract the most specific/important terms first
    // Priority order: specific nouns > general nouns > adjectives
    const specificTerms = cleaned.match(/\b(?:sushi|wine|coffee|tea|pizza|pasta|music|jazz|rock|classical|book|novel|movie|film|sport|football|soccer|basketball|travel|japan|france|italy|work|job|programming|coding|art|painting|photography)\b/gi);
    const generalTerms = cleaned.match(/\b(?:food|drink|hobby|color|favorite|skill|knowledge|preference)\b/gi);
    
    // Step 7: Choose the best search term
    let finalQuery = '';
    
    if (specificTerms && specificTerms.length > 0) {
      // Use the first specific term (most likely to get results)
      finalQuery = specificTerms[0];
    } else if (generalTerms && generalTerms.length > 0) {
      // Use general term if no specific ones found
      finalQuery = generalTerms[0];
    } else if (cleaned && cleaned.length > 0) {
      // Take the first meaningful word from cleaned query
      const words = cleaned.split(/\s+/).filter(word => 
        word.length > 2 && 
        !word.match(/^(the|and|or|is|are|was|were|do|does|did|will|would|can|could|what|how|when|where|why)$/i)
      );
      finalQuery = words[0] || cleaned;
    }
    
    // Step 8: Fallback if nothing meaningful found
    if (!finalQuery || finalQuery.length < 2) {
      // Extract any meaningful words as last resort
      const words = query.replace(/^magi,?\s*/i, '').split(/\s+/).filter(word => 
        word.length > 2 && 
        !word.match(/^(@\w+|the|and|or|is|are|was|were|do|does|did|will|would|can|could|what|how|when|where|why|likes?|preferences?)$/i)
      );
      finalQuery = words[0] || 'food'; // Ultimate fallback
    }
    
    console.log(`🔍 Query cleaning: "${query}" → "${finalQuery}"`);
    return finalQuery;
  }
}