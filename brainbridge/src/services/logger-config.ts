import winston from 'winston';
import * as path from 'path';

// Custom log levels with colors and priorities
const customLevels = {
  levels: {
    error: 0,
    warn: 1, 
    info: 2,
    perf: 3,
    trace: 4,
    debug: 5
  },
  colors: {
    error: 'red bold',
    warn: 'yellow bold',
    info: 'blue',
    perf: 'green bold',
    trace: 'gray',
    debug: 'magenta'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Custom format for console output with colors and emojis
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Add emojis based on log level
    const emoji = {
      error: '🚨',
      warn: '⚠️ ',
      info: '🕐',
      perf: '⚡',
      trace: '🔍',
      debug: '🐛'
    }[level.replace(/\u001b\[[0-9;]*m/g, '')] || '📝';
    
    // Format the base message
    let logLine = `${emoji} ${timestamp} │ ${level.padEnd(15)} │ ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta, null, 0);
      logLine += ` │ ${metaStr}`;
    }
    
    return logLine;
  })
);

// Custom format for file output (no colors, structured)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const prefix = level.toUpperCase();
    let logLine = `${timestamp}: [${prefix}] ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta);
      logLine += ` | ${metaStr}`;
    }
    
    return logLine;
  })
);

// Create Winston configuration - simplified single file
export function createWinstonConfig(logFile: string, traceMode: boolean = false) {
  // Determine log level based on trace mode
  const level = traceMode ? 'trace' : 'info';
  
  const transports: winston.transport[] = [
    // Simple file transport - write to the original log file
    new winston.transports.File({
      filename: logFile,
      format: fileFormat,
      level: level
    })
  ];
  
  // Add console transport only in trace mode or development
  if (traceMode || process.env.NODE_ENV === 'development') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: level
      })
    );
  }
  
  return winston.createLogger({
    levels: customLevels.levels,
    level: level,
    transports,
    // Handle uncaught exceptions and rejections
    handleExceptions: true,
    handleRejections: true,
    // Exit on handled exceptions (set to false for production)
    exitOnError: false
  });
}

// Performance timer utility
export class PerformanceTimer {
  private startTime: number;
  private label: string;
  
  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }
  
  end(metadata?: any): { duration: number; label: string; metadata?: any } {
    const duration = Math.round(performance.now() - this.startTime);
    return {
      duration,
      label: this.label,
      ...(metadata && { metadata })
    };
  }
}