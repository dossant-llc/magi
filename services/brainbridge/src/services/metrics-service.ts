#!/usr/bin/env node

/**
 * Metrics Service - Real performance tracking for mAGIc operations
 * Tracks actual save/retrieve/synthesize effectiveness with real data
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from './logger-service.js';

export interface SaveMetrics {
  timestamp: string;
  operation: 'save';
  contentLength: number;
  aiCategorizationUsed: boolean;
  aiCategoryConfidence?: number;
  manualCategoryOverride?: boolean;
  privacyLevel: string;
  processingTimeMs: number;
  embeddingGenerationTimeMs?: number;
  isDuplicateDetected: boolean;
  duplicateScore?: number;
}

export interface RetrieveMetrics {
  timestamp: string;
  operation: 'retrieve';
  query: string;
  queryType: 'question' | 'list' | 'analytical' | 'lookup';
  temporalSensitive: boolean;
  resultsCount: number;
  avgSimilarityScore: number;
  bestSimilarityScore: number;
  processingTimeMs: number;
  synthesisUsed: boolean;
  sourceFilesIntegrated: number;
  responseLengthChars: number;
  userFollowUpWithinMinutes?: number; // Indicates satisfaction
}

export interface SynthesizeMetrics {
  timestamp: string;
  operation: 'synthesize';
  query: string;
  sourceFilesCount: number;
  sourcePrivacyLevels: string[];
  temporalSpanDays?: number; // How far back sources go
  synthesisMethod: 'ai_powered' | 'simple_concat' | 'fallback';
  processingTimeMs: number;
  outputQuality: 'excellent' | 'good' | 'basic' | 'poor';
  crossFileIntegration: boolean;
  duplicateContentRemoved: boolean;
}

export interface SystemMetrics {
  timestamp: string;
  operation: 'system';
  totalMemories: number;
  memoriesByPrivacy: Record<string, number>;
  fragmentationIndex: number; // 0-1, lower is better
  avgQueryResponseTime: number;
  indexHealth: 'excellent' | 'good' | 'stale' | 'missing';
  diskUsageMB: number;
}

export type MetricsEvent = SaveMetrics | RetrieveMetrics | SynthesizeMetrics | SystemMetrics;

export class MetricsService {
  private metricsDir: string;
  private logger: LoggerService;
  private sessionStartTime: number;
  private recentQueries: Array<{ query: string; timestamp: number }> = [];

  constructor(metricsDir: string, logger: LoggerService) {
    this.metricsDir = metricsDir;
    this.logger = logger;
    this.sessionStartTime = Date.now();

    // Ensure metrics directory exists
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  /**
   * Record a save operation with real metrics
   */
  recordSave(metrics: Omit<SaveMetrics, 'timestamp' | 'operation'>): void {
    const event: SaveMetrics = {
      timestamp: new Date().toISOString(),
      operation: 'save',
      ...metrics
    };

    this.writeMetricsEvent(event);
    this.logger.log(`📊 Save metrics: ${metrics.contentLength}chars, ${metrics.processingTimeMs}ms, AI:${metrics.aiCategorizationUsed}`);
  }

  /**
   * Record a retrieve operation with real performance data
   */
  recordRetrieve(metrics: Omit<RetrieveMetrics, 'timestamp' | 'operation'>): void {
    // Check if this is a follow-up query (indicates previous result wasn't satisfactory)
    const followUpTime = this.detectFollowUpQuery(metrics.query);

    const event: RetrieveMetrics = {
      timestamp: new Date().toISOString(),
      operation: 'retrieve',
      userFollowUpWithinMinutes: followUpTime,
      ...metrics
    };

    this.writeMetricsEvent(event);
    this.recentQueries.push({ query: metrics.query, timestamp: Date.now() });

    // Keep only last 10 queries for follow-up detection
    if (this.recentQueries.length > 10) {
      this.recentQueries = this.recentQueries.slice(-10);
    }

    this.logger.log(`📊 Retrieve metrics: ${metrics.resultsCount} results, ${metrics.avgSimilarityScore.toFixed(2)} avg similarity, ${metrics.processingTimeMs}ms`);
  }

  /**
   * Record synthesis operation effectiveness
   */
  recordSynthesize(metrics: Omit<SynthesizeMetrics, 'timestamp' | 'operation'>): void {
    const event: SynthesizeMetrics = {
      timestamp: new Date().toISOString(),
      operation: 'synthesize',
      ...metrics
    };

    this.writeMetricsEvent(event);
    this.logger.log(`📊 Synthesis metrics: ${metrics.sourceFilesCount} sources, ${metrics.synthesisMethod}, ${metrics.outputQuality} quality`);
  }

  /**
   * Record system-wide health metrics
   */
  recordSystemHealth(metrics: Omit<SystemMetrics, 'timestamp' | 'operation'>): void {
    const event: SystemMetrics = {
      timestamp: new Date().toISOString(),
      operation: 'system',
      ...metrics
    };

    this.writeMetricsEvent(event);
    this.logger.log(`📊 System metrics: ${metrics.totalMemories} memories, fragmentation: ${metrics.fragmentationIndex.toFixed(3)}`);
  }

  /**
   * Get effectiveness dashboard data
   */
  async getDashboardMetrics(): Promise<{
    saveEffectiveness: any;
    retrievePerformance: any;
    synthesizeQuality: any;
    systemHealth: any;
  }> {
    const recentEvents = this.getRecentMetrics(7); // Last 7 days

    const saveEvents = recentEvents.filter(e => e.operation === 'save') as SaveMetrics[];
    const retrieveEvents = recentEvents.filter(e => e.operation === 'retrieve') as RetrieveMetrics[];
    const synthesizeEvents = recentEvents.filter(e => e.operation === 'synthesize') as SynthesizeMetrics[];
    const systemEvents = recentEvents.filter(e => e.operation === 'system') as SystemMetrics[];

    return {
      saveEffectiveness: this.analyzeSaveEffectiveness(saveEvents),
      retrievePerformance: this.analyzeRetrievePerformance(retrieveEvents),
      synthesizeQuality: this.analyzeSynthesizeQuality(synthesizeEvents),
      systemHealth: this.analyzeSystemHealth(systemEvents)
    };
  }

  /**
   * Detect if current query is a follow-up (indicates previous answer was incomplete)
   */
  private detectFollowUpQuery(currentQuery: string): number | undefined {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    for (const recent of this.recentQueries) {
      const timeDiff = now - recent.timestamp;
      if (timeDiff < fiveMinutes) {
        // Simple similarity check - if queries share significant words, it's likely a follow-up
        const currentWords = currentQuery.toLowerCase().split(/\s+/);
        const recentWords = recent.query.toLowerCase().split(/\s+/);
        const intersection = currentWords.filter(w => recentWords.includes(w) && w.length > 3);

        if (intersection.length >= 2) {
          return Math.round(timeDiff / (60 * 1000)); // Return minutes
        }
      }
    }
    return undefined;
  }

  private writeMetricsEvent(event: MetricsEvent): void {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `metrics-${date}.jsonl`;
    const filepath = path.join(this.metricsDir, filename);

    try {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(filepath, line, 'utf8');
    } catch (error) {
      this.logger.log(`Failed to write metrics: ${error}`, 'error');
    }
  }

  private getRecentMetrics(days: number): MetricsEvent[] {
    const events: MetricsEvent[] = [];
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    try {
      // Read recent metric files
      const files = fs.readdirSync(this.metricsDir)
        .filter(f => f.startsWith('metrics-') && f.endsWith('.jsonl'))
        .sort()
        .slice(-days); // Get last N days of files

      for (const file of files) {
        const filepath = path.join(this.metricsDir, file);
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const event = JSON.parse(line) as MetricsEvent;
            if (new Date(event.timestamp).getTime() >= cutoffTime) {
              events.push(event);
            }
          } catch (parseError) {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      this.logger.log(`Failed to read recent metrics: ${error}`, 'warn');
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private analyzeSaveEffectiveness(events: SaveMetrics[]) {
    if (events.length === 0) return null;

    const aiCategorizationAccuracy = events.filter(e => e.aiCategorizationUsed && !e.manualCategoryOverride).length / events.filter(e => e.aiCategorizationUsed).length;
    const duplicatesDetected = events.filter(e => e.isDuplicateDetected).length;
    const avgProcessingTime = events.reduce((sum, e) => sum + e.processingTimeMs, 0) / events.length;

    return {
      totalSaves: events.length,
      aiCategorizationAccuracy: Math.round(aiCategorizationAccuracy * 100),
      duplicatesDetected,
      avgProcessingTimeMs: Math.round(avgProcessingTime)
    };
  }

  private analyzeRetrievePerformance(events: RetrieveMetrics[]) {
    if (events.length === 0) return null;

    const avgSimilarity = events.reduce((sum, e) => sum + e.avgSimilarityScore, 0) / events.length;
    const avgResponseTime = events.reduce((sum, e) => sum + e.processingTimeMs, 0) / events.length;
    const synthesisRate = events.filter(e => e.synthesisUsed).length / events.length;
    const avgSourceFiles = events.reduce((sum, e) => sum + e.sourceFilesIntegrated, 0) / events.length;
    const followUpRate = events.filter(e => e.userFollowUpWithinMinutes !== undefined).length / events.length;

    return {
      totalQueries: events.length,
      avgRelevanceScore: Math.round(avgSimilarity * 100) / 100,
      avgResponseTimeMs: Math.round(avgResponseTime),
      synthesisRate: Math.round(synthesisRate * 100),
      avgSourceFiles: Math.round(avgSourceFiles * 10) / 10,
      userSatisfaction: Math.round((1 - followUpRate) * 100) // Lower follow-up rate = higher satisfaction
    };
  }

  private analyzeSynthesizeQuality(events: SynthesizeMetrics[]) {
    if (events.length === 0) return null;

    const qualityScores = { excellent: 4, good: 3, basic: 2, poor: 1 };
    const avgQuality = events.reduce((sum, e) => sum + qualityScores[e.outputQuality], 0) / events.length;
    const aiPoweredRate = events.filter(e => e.synthesisMethod === 'ai_powered').length / events.length;
    const crossFileRate = events.filter(e => e.crossFileIntegration).length / events.length;

    return {
      totalSyntheses: events.length,
      avgQualityScore: Math.round(avgQuality * 100) / 100,
      aiPoweredRate: Math.round(aiPoweredRate * 100),
      crossFileIntegrationRate: Math.round(crossFileRate * 100)
    };
  }

  private analyzeSystemHealth(events: SystemMetrics[]) {
    if (events.length === 0) return null;

    const latest = events[events.length - 1];
    const oldest = events[0];
    const growthRate = events.length > 1 ?
      (latest.totalMemories - oldest.totalMemories) / Math.max(1, events.length - 1) : 0;

    return {
      totalMemories: latest.totalMemories,
      memoriesByPrivacy: latest.memoriesByPrivacy,
      fragmentationIndex: Math.round(latest.fragmentationIndex * 1000) / 1000,
      avgQueryResponseTime: Math.round(latest.avgQueryResponseTime),
      indexHealth: latest.indexHealth,
      dailyGrowthRate: Math.round(growthRate * 10) / 10,
      diskUsageMB: latest.diskUsageMB
    };
  }
}