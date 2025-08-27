import * as fs from 'fs';
import * as path from 'path';

export class LoggerService {
  private logFile: string;
  private traceMode: boolean;
  private performanceMarks: Map<string, number>;
  private traceStateFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
    this.traceStateFile = path.join(path.dirname(logFile), 'trace-mode.flag');
    
    // Check if trace mode should be enabled (env var or persistent file)
    this.traceMode = process.env.TRACE_MODE === 'true' || this.loadTraceState();
    this.performanceMarks = new Map();
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
    this.log(`Trace mode ${enabled ? 'enabled' : 'disabled'} (persistent)`, 'info');
  }
  
  isTraceModeEnabled(): boolean {
    return this.traceMode;
  }

  log(message: string, level: 'info' | 'trace' | 'error' | 'perf' = 'info'): void {
    // Skip trace logs if not in trace mode
    if (level === 'trace' && !this.traceMode) return;
    
    const timestamp = new Date().toISOString();
    const prefix = this.traceMode ? `[${level.toUpperCase()}] ` : '';
    const logMessage = `${timestamp}: ${prefix}${message}\n`;
    
    try {
      // Ensure logs directory exists
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(this.logFile, logMessage);
      
      // Also output to console in trace mode
      if (this.traceMode) {
        console.error(`[TRACE] ${message}`);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  startTimer(label: string): void {
    this.performanceMarks.set(label, Date.now());
    if (this.traceMode) {
      this.log(`Timer started: ${label}`, 'perf');
    }
  }
  
  endTimer(label: string, metadata?: any): void {
    const startTime = this.performanceMarks.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      const metadataStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
      this.log(`Timer [${label}]: ${duration}ms${metadataStr}`, 'perf');
      this.performanceMarks.delete(label);
    }
  }
  
  trace(message: string, data?: any): void {
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    this.log(`${message}${dataStr}`, 'trace');
  }
}