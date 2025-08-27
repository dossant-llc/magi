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
class LoggerService {
    logFile;
    traceMode;
    performanceMarks;
    traceStateFile;
    constructor(logFile) {
        this.logFile = logFile;
        this.traceStateFile = path.join(path.dirname(logFile), 'trace-mode.flag');
        // Check if trace mode should be enabled (env var or persistent file)
        this.traceMode = process.env.TRACE_MODE === 'true' || this.loadTraceState();
        this.performanceMarks = new Map();
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
        this.log(`Trace mode ${enabled ? 'enabled' : 'disabled'} (persistent)`, 'info');
    }
    isTraceModeEnabled() {
        return this.traceMode;
    }
    log(message, level = 'info') {
        // Skip trace logs if not in trace mode
        if (level === 'trace' && !this.traceMode)
            return;
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
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    startTimer(label) {
        this.performanceMarks.set(label, Date.now());
        if (this.traceMode) {
            this.log(`Timer started: ${label}`, 'perf');
        }
    }
    endTimer(label, metadata) {
        const startTime = this.performanceMarks.get(label);
        if (startTime) {
            const duration = Date.now() - startTime;
            const metadataStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
            this.log(`Timer [${label}]: ${duration}ms${metadataStr}`, 'perf');
            this.performanceMarks.delete(label);
        }
    }
    trace(message, data) {
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        this.log(`${message}${dataStr}`, 'trace');
    }
}
exports.LoggerService = LoggerService;
