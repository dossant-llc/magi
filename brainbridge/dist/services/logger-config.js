"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTimer = void 0;
exports.createWinstonConfig = createWinstonConfig;
const winston_1 = __importDefault(require("winston"));
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
winston_1.default.addColors(customLevels.colors);
// Custom format for console output with colors and emojis
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'HH:mm:ss.SSS' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
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
}));
// Enhanced format for file output with emojis and visual appeal
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    // Add emojis and visual elements based on log level
    const levelInfo = {
        error: { emoji: '🚨', prefix: 'ERROR', color: '31' }, // red
        warn: { emoji: '⚠️ ', prefix: 'WARN ', color: '33' }, // yellow
        info: { emoji: '💡', prefix: 'INFO ', color: '36' }, // cyan
        perf: { emoji: '⚡', prefix: 'PERF ', color: '32' }, // green
        trace: { emoji: '🔍', prefix: 'TRACE', color: '90' }, // gray
        debug: { emoji: '🐛', prefix: 'DEBUG', color: '35' } // magenta
    }[level] || { emoji: '📝', prefix: level.toUpperCase().padEnd(5), color: '37' };
    // Create colorized and formatted log line
    const colorCode = `\u001b[${levelInfo.color}m`;
    const resetCode = '\u001b[0m';
    const boldCode = '\u001b[1m';
    let logLine = `${levelInfo.emoji} ${colorCode}${timestamp}${resetCode} │ ${boldCode}${colorCode}[${levelInfo.prefix}]${resetCode} │ ${message}`;
    // Add metadata with visual formatting if present
    if (Object.keys(meta).length > 0) {
        const metaStr = JSON.stringify(meta, null, 0);
        logLine += ` ${colorCode}│${resetCode} \u001b[2m${metaStr}\u001b[0m`; // dim metadata
    }
    return logLine;
}));
// Create Winston configuration - simplified single file
function createWinstonConfig(logFile, traceMode = true) {
    // Determine log level based on trace mode
    const level = traceMode ? 'trace' : 'info';
    const transports = [
        // Simple file transport - write to the original log file
        new winston_1.default.transports.File({
            filename: logFile,
            format: fileFormat,
            level: level
        })
    ];
    // Always add console transport for better visibility
    transports.push(new winston_1.default.transports.Console({
        format: consoleFormat,
        level: level
    }));
    return winston_1.default.createLogger({
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
class PerformanceTimer {
    startTime;
    label;
    constructor(label) {
        this.label = label;
        this.startTime = performance.now();
    }
    end(metadata) {
        const duration = Math.round(performance.now() - this.startTime);
        return {
            duration,
            label: this.label,
            ...(metadata && { metadata })
        };
    }
}
exports.PerformanceTimer = PerformanceTimer;
