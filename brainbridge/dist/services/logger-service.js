"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_config_js_1 = require("./logger-config.js");
class LoggerService {
    logFile;
    traceMode;
    performanceMarks;
    traceStateFile;
    logger;
    constructor(logFile) {
        this.logFile = logFile;
        this.traceStateFile = path.join(path.dirname(logFile), 'trace-mode.flag');
        // Check if trace mode should be enabled (env var or persistent file)
        this.traceMode = process.env.TRACE_MODE === 'true' || this.loadTraceState();
        this.performanceMarks = new Map();
        // Initialize Winston logger
        this.logger = (0, logger_config_js_1.createWinstonConfig)(logFile, this.traceMode);
        // Ensure logs directory exists
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    loadTraceState() {
        try {
            return fs.existsSync(this.traceStateFile);
        }
        catch {
            return false;
        }
    }
    saveTraceState(enabled) {
        try {
            if (enabled) {
                fs.writeFileSync(this.traceStateFile, 'enabled');
            }
            else {
                if (fs.existsSync(this.traceStateFile)) {
                    fs.unlinkSync(this.traceStateFile);
                }
            }
        }
        catch (error) {
            this.log(`Failed to persist trace state: ${error}`, 'error');
        }
    }
    setTraceMode(enabled) {
        this.traceMode = enabled;
        this.saveTraceState(enabled);
        // Recreate logger with new trace mode setting
        this.logger = (0, logger_config_js_1.createWinstonConfig)(this.logFile, enabled);
        this.log(`Trace mode ${enabled ? 'enabled' : 'disabled'} (persistent)`, 'info');
    }
    isTraceModeEnabled() {
        return this.traceMode;
    }
    log(message, level = 'info') {
        try {
            this.logger.log(level, message);
        }
        catch (error) {
            console.error('Failed to write to log:', error);
            console.error('Original message:', message);
        }
    }
    startTimer(label) {
        const timer = new logger_config_js_1.PerformanceTimer(label);
        this.performanceMarks.set(label, timer);
        if (this.traceMode) {
            this.log(`Timer started: ${label}`, 'perf');
        }
    }
    endTimer(label, metadata) {
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
    trace(message, data) {
        if (data) {
            this.logger.log('trace', message, data);
        }
        else {
            this.logger.log('trace', message);
        }
    }
    // Additional convenience methods
    warn(message, metadata) {
        if (metadata) {
            this.logger.warn(message, metadata);
        }
        else {
            this.logger.warn(message);
        }
    }
    error(message, error) {
        if (error) {
            if (error instanceof Error) {
                this.logger.error(message, {
                    error: error.message,
                    stack: error.stack,
                    name: error.name
                });
            }
            else {
                this.logger.error(message, { error });
            }
        }
        else {
            this.logger.error(message);
        }
    }
    debug(message, metadata) {
        if (metadata) {
            this.logger.debug(message, metadata);
        }
        else {
            this.logger.debug(message);
        }
    }
    // Get underlying winston logger for advanced usage
    getWinstonLogger() {
        return this.logger;
    }
    // Direct access to winston logger for structured logging
    get winston() {
        return this.logger;
    }
}
exports.LoggerService = LoggerService;
