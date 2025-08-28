import * as fs from 'fs';
import * as path from 'path';
import winston from 'winston';
import { createWinstonConfig, PerformanceTimer } from './logger-config.js';

export class LoggerService {
  private logFile: string;
  private traceMode: boolean;
  private performanceMarks: Map<string, PerformanceTimer>;
  private traceStateFile: string;
  private logger: winston.Logger;

  constructor(logFile: string) {
    this.logFile = logFile;
    this.traceStateFile = path.join(path.dirname(logFile), 'trace-mode.flag');
    
    // Check if trace mode should be enabled (env var or persistent file)
    this.traceMode = process.env.TRACE_MODE === 'true' || this.loadTraceState();
    this.performanceMarks = new Map();
    
    // Initialize Winston logger
    this.logger = createWinstonConfig(logFile, this.traceMode);
    
    // Ensure logs directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  private loadTraceState(): boolean {
    try {
      return fs.existsSync(this.traceStateFile);
    } catch {
      return false;
    }
  }
  
  private saveTraceState(enabled: boolean): void {
    try {
      if (enabled) {
        fs.writeFileSync(this.traceStateFile, 'enabled');
      } else {
        if (fs.existsSync(this.traceStateFile)) {
          fs.unlinkSync(this.traceStateFile);
        }
      }
    } catch (error) {
      this.log(`Failed to persist trace state: ${error}`, 'error');
    }
  }
  
  setTraceMode(enabled: boolean): void {
    this.traceMode = enabled;
    this.saveTraceState(enabled);
    
    // Recreate logger with new trace mode setting
    this.logger = createWinstonConfig(this.logFile, enabled);
    
    this.log(`Trace mode ${enabled ? 'enabled' : 'disabled'} (persistent)`, 'info');
  }
  
  isTraceModeEnabled(): boolean {
    return this.traceMode;
  }

  log(message: string, level: 'info' | 'trace' | 'error' | 'perf' | 'warn' | 'debug' = 'info'): void {
    try {
      this.logger.log(level, message);
    } catch (error) {
      console.error('Failed to write to log:', error);
      console.error('Original message:', message);
    }
  }
  
  startTimer(label: string): void {
    const timer = new PerformanceTimer(label);
    this.performanceMarks.set(label, timer);
    if (this.traceMode) {
      this.log(`Timer started: ${label}`, 'perf');
    }
  }
  
  endTimer(label: string, metadata?: any): void {
    const timer = this.performanceMarks.get(label);
    if (timer) {
      const result = timer.end(metadata);
      
      // Create a formatted message for the timer result
      const message = `Timer [${result.label}]: ${result.duration}ms`;
      
      // Log with metadata as structured data
      this.logger.log('perf', message, result.metadata);
      
      this.performanceMarks.delete(label);
    }
  }
  
  trace(message: string, data?: any): void {
    if (data) {
      this.logger.log('trace', message, data);
    } else {
      this.logger.log('trace', message);
    }
  }
  
  // Additional convenience methods
  warn(message: string, metadata?: any): void {
    if (metadata) {
      this.logger.warn(message, metadata);
    } else {
      this.logger.warn(message);
    }
  }
  
  error(message: string, error?: Error | any): void {
    if (error) {
      if (error instanceof Error) {
        this.logger.error(message, { 
          error: error.message, 
          stack: error.stack,
          name: error.name
        });
      } else {
        this.logger.error(message, { error });
      }
    } else {
      this.logger.error(message);
    }
  }
  
  debug(message: string, metadata?: any): void {
    if (metadata) {
      this.logger.debug(message, metadata);
    } else {
      this.logger.debug(message);
    }
  }
  
  // Get underlying winston logger for advanced usage
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
  
  // Direct access to winston logger for structured logging
  get winston(): winston.Logger {
    return this.logger;
  }
}