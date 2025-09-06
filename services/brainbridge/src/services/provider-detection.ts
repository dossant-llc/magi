/**
 * Provider Detection Service - Detects provider changes and manages index rebuilds
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { LoggerService } from './logger-service';
import { EmbeddingService } from './embedding-service';
import { aiConfig, AIProvider } from '../config/ai-config';

interface ProviderState {
  provider: AIProvider;
  chatModel: string;
  embeddingModel: string;
  lastCheck: string;
}

export class ProviderDetectionService {
  private loggerService: LoggerService;
  private stateFilePath: string;
  private embeddingService: EmbeddingService;

  constructor(loggerService: LoggerService, embeddingService: EmbeddingService) {
    this.loggerService = loggerService;
    this.embeddingService = embeddingService;
    
    // Store provider state in the base memories directory
    const baseMemoriesDir = require('../utils/memory-path').getMemoriesPath();
    this.stateFilePath = path.join(baseMemoriesDir, '.provider-state.json');
  }

  /**
   * Check if the AI provider has changed and handle any necessary actions
   */
  async checkProviderChange(): Promise<{
    changed: boolean;
    previousProvider?: AIProvider;
    currentProvider: AIProvider;
    indexRebuildRequired: boolean;
  }> {
    const currentConfig = aiConfig.getConfig();
    const currentState: ProviderState = {
      provider: currentConfig.provider,
      chatModel: currentConfig.chatModel,
      embeddingModel: currentConfig.embeddingModel,
      lastCheck: new Date().toISOString()
    };

    try {
      const previousState = await this.loadProviderState();
      
      if (!previousState) {
        // First run - save current state
        await this.saveProviderState(currentState);
        this.loggerService.log(`Provider detection initialized with ${currentState.provider} provider`);
        
        return {
          changed: false,
          currentProvider: currentState.provider,
          indexRebuildRequired: await this.checkIndexExists()
        };
      }

      const providerChanged = previousState.provider !== currentState.provider;
      const embeddingModelChanged = previousState.embeddingModel !== currentState.embeddingModel;
      
      if (providerChanged || embeddingModelChanged) {
        this.loggerService.log(`AI provider change detected: ${previousState.provider} -> ${currentState.provider}`);
        
        if (embeddingModelChanged) {
          this.loggerService.log(`Embedding model changed: ${previousState.embeddingModel} -> ${currentState.embeddingModel}`);
        }
        
        // Save new state
        await this.saveProviderState(currentState);
        
        return {
          changed: true,
          previousProvider: previousState.provider,
          currentProvider: currentState.provider,
          indexRebuildRequired: true
        };
      }

      // No change - update last check time
      await this.saveProviderState(currentState);
      
      return {
        changed: false,
        currentProvider: currentState.provider,
        indexRebuildRequired: false
      };

    } catch (error) {
      this.loggerService.error('Provider detection failed', {
        error: error instanceof Error ? error.message : String(error),
        stateFilePath: this.stateFilePath
      });
      
      // On error, assume no change and save current state
      await this.saveProviderState(currentState);
      
      return {
        changed: false,
        currentProvider: currentState.provider,
        indexRebuildRequired: false
      };
    }
  }

  /**
   * Check if embedding index exists for current provider
   */
  private async checkIndexExists(): Promise<boolean> {
    try {
      const baseMemoriesDir = require('../utils/memory-path').getMemoriesPath();
      const indexPath = aiConfig.getIndexPath(path.join(baseMemoriesDir, 'embeddings'));
      const embeddingsPath = path.join(indexPath, 'embeddings.txt');
      
      await fs.access(embeddingsPath);
      return false; // Index exists, no rebuild needed
    } catch {
      return true; // Index doesn't exist, rebuild needed
    }
  }

  /**
   * Automatically rebuild embedding index if provider changed
   */
  async handleProviderChange(): Promise<{
    success: boolean;
    rebuilt: boolean;
    stats?: any;
    error?: string;
  }> {
    try {
      const changeResult = await this.checkProviderChange();
      
      if (!changeResult.indexRebuildRequired) {
        return {
          success: true,
          rebuilt: false
        };
      }

      this.loggerService.log('Starting automatic index rebuild for provider change...');
      
      // Force rebuild the index
      const buildStats = await this.embeddingService.buildIndex(true);
      
      this.loggerService.log(`Index rebuild completed: ${buildStats.processed} files processed`);
      
      return {
        success: true,
        rebuilt: true,
        stats: buildStats
      };

    } catch (error) {
      this.loggerService.error('Provider change handling failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        rebuilt: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load previous provider state from disk
   */
  private async loadProviderState(): Promise<ProviderState | null> {
    try {
      const data = await fs.readFile(this.stateFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Save current provider state to disk
   */
  private async saveProviderState(state: ProviderState): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });
      await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      this.loggerService.error('Failed to save provider state', {
        error: error instanceof Error ? error.message : String(error),
        stateFilePath: this.stateFilePath
      });
    }
  }

  /**
   * Get current provider information
   */
  getProviderInfo(): {
    provider: AIProvider;
    chatModel: string;
    embeddingModel: string;
    indexPath: string;
  } {
    const config = aiConfig.getConfig();
    const baseMemoriesDir = require('../utils/memory-path').getMemoriesPath();
    const indexPath = aiConfig.getIndexPath(path.join(baseMemoriesDir, 'embeddings'));
    
    return {
      provider: config.provider,
      chatModel: config.chatModel,
      embeddingModel: config.embeddingModel,
      indexPath
    };
  }
}