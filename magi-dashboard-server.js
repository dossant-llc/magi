#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Store connected clients for Server-Sent Events
let clients = [];

// Serve static files
app.use(express.static(__dirname));

// SSE endpoint for log streaming
app.get('/logs/stream', (req, res) => {
    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add client to list
    const clientId = Date.now();
    const client = { id: clientId, response: res };
    clients.push(client);

    console.log(`Client ${clientId} connected`);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to magi log stream',
        timestamp: new Date().toISOString()
    })}\\n\\n`);

    // Remove client on disconnect
    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
        console.log(`Client ${clientId} disconnected`);
    });
});

// Function to broadcast log to all connected clients
function broadcastLog(logData) {
    try {
        // Ensure the data is safe for JSON and SSE
        let safeLogData;

        try {
            safeLogData = {
                ...logData,
                message: (logData.message || '').replace(/[\r\n\t]/g, ' ').substring(0, 1000), // Clean and limit message
                raw: logData.raw ? logData.raw.replace(/[\r\n\t]/g, ' ').substring(0, 1000) : '',
                metadata: logData.metadata && typeof logData.metadata === 'string' ?
                          logData.metadata.replace(/[\r\n\t]/g, ' ').substring(0, 500) :
                          logData.metadata,
                parsingError: logData.parsingError || null
            };
        } catch (dataError) {
            console.error('Error preparing log data:', dataError);
            safeLogData = {
                type: 'log',
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `DATA PREP ERROR: ${dataError.message}`,
                parsingError: `Data preparation failed: ${dataError.message}`,
                raw: String(logData.raw || logData.message || 'undefined')
            };
        }

        const jsonString = JSON.stringify(safeLogData);
        const message = `data: ${jsonString}\n\n`;

        console.log('Broadcasting safe message length:', message.length);
        if (safeLogData.parsingError) {
            console.log('⚠️ Broadcasting parsing error:', safeLogData.parsingError);
        }

        clients.forEach(client => {
            try {
                client.response.write(message);
            } catch (error) {
                console.error('Error sending to client:', error);
            }
        });
    } catch (error) {
        console.error('Error creating broadcast message:', error);

        // Fallback: send a simple error message
        const fallbackData = {
            type: 'log',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `BROADCAST ERROR: ${error.message} - Original data was corrupted`,
            parsingError: `Broadcast error: ${error.message}`,
            raw: 'broadcast_failed'
        };

        try {
            const fallbackMessage = `data: ${JSON.stringify(fallbackData)}\n\n`;
            clients.forEach(client => {
                try {
                    client.response.write(fallbackMessage);
                } catch (clientError) {
                    console.error('Error sending fallback to client:', clientError);
                }
            });
        } catch (fallbackError) {
            console.error('Even fallback broadcast failed:', fallbackError);
        }
    }
}


// Function to parse magi log line
function parseLogLine(line) {
    try {
        if (!line.trim()) return null;

        // Remove ANSI escape codes
        const cleanLine = line.replace(/\u001b\[[0-9;]*[mGK]/g, '');

        console.log('Parsing line:', cleanLine); // Debug output

        // Parse the new log format: 💡 [timestamp] │ [LEVEL] │ message │ metadata
        const logMatch = cleanLine.match(/💡\s*(.+?)\s*│\s*\[(.+?)\]\s*│\s*(.+?)(?:\s*│\s*(.+))?$/);

        if (logMatch) {
            const [, timestamp, level, message, metadata] = logMatch;

            let logLevel = 'info';
            if (level.includes('ERROR')) logLevel = 'error';
            else if (level.includes('WARN')) logLevel = 'warn';
            else if (level.includes('INFO')) logLevel = 'info';

            // Try to parse JSON metadata
            let parsedMetadata = null;
            let cleanMessage = message.trim();
            let parsingError = null;

            if (metadata?.trim()) {
                const metadataStr = metadata.trim();
                try {
                    parsedMetadata = JSON.parse(metadataStr);

                    // Extract useful info from metadata to enhance the message
                    if (parsedMetadata.component) {
                        cleanMessage = `[${parsedMetadata.component}] ${cleanMessage}`;
                    }
                    if (parsedMetadata.action && parsedMetadata.action !== parsedMetadata.component) {
                        cleanMessage = `${cleanMessage} (${parsedMetadata.action})`;
                    }
                } catch (e) {
                    // If JSON parsing fails, show the error in the message
                    parsingError = `JSON Parse Error: ${e.message}`;
                    parsedMetadata = `${metadataStr} [PARSE ERROR: ${e.message}]`;
                    cleanMessage = `${cleanMessage} [JSON PARSE FAILED]`;
                    console.log('JSON parsing failed:', e.message, 'for metadata:', metadataStr);
                }
            }

            const logData = {
                type: 'log',
                timestamp: new Date().toISOString(),
                time: timestamp.trim(),
                level: parsingError ? 'warn' : logLevel,
                message: cleanMessage,
                metadata: parsedMetadata,
                parsingError: parsingError,
                raw: cleanLine
            };

            console.log('Broadcasting enhanced log:', logData);
            return logData;
        }
    } catch (error) {
        // Catch any unexpected errors in parsing
        console.error('Unexpected error in parseLogLine:', error);
        return {
            type: 'log',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `PARSING ERROR: ${error.message}`,
            metadata: null,
            parsingError: `Critical parsing error: ${error.message}`,
            raw: line || 'undefined'
        };
    }

    try {
        // Handle error/warning lines with emojis (fallback)
        if (cleanLine.includes('🚨') || cleanLine.toLowerCase().includes('error')) {
            return {
                type: 'log',
                timestamp: new Date().toISOString(),
                level: 'error',
                message: cleanLine.trim(),
                raw: cleanLine
            };
        }

        if (cleanLine.includes('⚠️') || cleanLine.toLowerCase().includes('warn')) {
            return {
                type: 'log',
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: cleanLine.trim(),
                raw: cleanLine
            };
        }

        // ALWAYS show something - even if parsing fails, show the raw line
        if (cleanLine.trim()) {
            let level = 'info';

            // Try to guess level from content
            if (cleanLine.toLowerCase().includes('error') || cleanLine.includes('🚨')) {
                level = 'error';
            } else if (cleanLine.toLowerCase().includes('warn') || cleanLine.includes('⚠️')) {
                level = 'warn';
            }

            return {
                type: 'log',
                timestamp: new Date().toISOString(),
                level: level,
                message: cleanLine.trim(),
                raw: cleanLine
            };
        }

        return null;
    } catch (error) {
        // Final fallback - show even the most basic parsing error
        console.error('Critical error in parseLogLine fallback:', error);
        return {
            type: 'log',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `CRITICAL PARSE ERROR: ${error.message} - Raw: ${line}`,
            parsingError: `Critical fallback error: ${error.message}`,
            raw: line || 'undefined'
        };
    }
}

// Start magi logs process
function startMagiLogs() {
    console.log('Starting magi logs process...');

    // Tail the actual BrainBridge log file
    const logFile = path.join(__dirname, 'services/brainbridge/logs/brainbridge-default.log');

    // Check if log file exists
    if (!fs.existsSync(logFile)) {
        console.error('Log file not found:', logFile);
        broadcastLog({
            type: 'error',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Log file not found: ${logFile}`,
            raw: ''
        });
        return;
    }

    const magiProcess = spawn('tail', ['-f', logFile], {
        cwd: __dirname
    });

    let buffer = '';

    magiProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        lines.forEach(line => {
            const logData = parseLogLine(line);
            if (logData) {
                broadcastLog(logData);
            }
        });
    });

    magiProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\\n');
        lines.forEach(line => {
            const logData = parseLogLine(line);
            if (logData && logData.message) {
                logData.level = 'error';
                broadcastLog(logData);
            }
        });
    });

    magiProcess.on('close', (code) => {
        console.log(`magi logs process exited with code ${code}`);
        broadcastLog({
            type: 'error',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Magi logs process exited with code ${code}`,
            raw: ''
        });

        // Restart after 5 seconds
        setTimeout(startMagiLogs, 5000);
    });

    magiProcess.on('error', (error) => {
        console.error('Failed to start magi logs:', error);
        broadcastLog({
            type: 'error',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Failed to start magi logs: ${error.message}`,
            raw: ''
        });
    });

    return magiProcess;
}

// API endpoint to get magi status
app.get('/api/status', async (req, res) => {
    try {
        const statusProcess = spawn('npm', ['run', 'magic', 'status'], {
            cwd: __dirname,
            env: { ...process.env, AI_PROVIDER: 'openai' }
        });

        let output = '';
        statusProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        statusProcess.on('close', (code) => {
            res.json({
                success: code === 0,
                output: output,
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'magi-dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        clients: clients.length,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🧙 Magi Dashboard Server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 Log Stream: http://localhost:${PORT}/logs/stream`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);

    // Start the magi logs process
    startMagiLogs();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down magi dashboard server...');
    process.exit(0);
});