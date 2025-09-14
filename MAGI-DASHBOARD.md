# Magi Dashboard Documentation

## Overview
A real-time HTML dashboard for monitoring magi system logs with beautiful glassmorphism UI design. Provides live log streaming, filtering, search capabilities, and error handling.

## Quick Start
```bash
# Start the dashboard server
node magi-dashboard-server.js
# OR with auto-restart
nodemon magi-dashboard-server.js

# Access dashboard
open http://localhost:3002
```

## Architecture

### Files
- **`magi-dashboard.html`** - Complete HTML dashboard with embedded CSS and JavaScript
- **`magi-dashboard-server.js`** - Node.js Express server for log streaming and SSE

### Technology Stack
- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript (no frameworks)
- **Real-time**: Server-Sent Events (SSE)
- **Styling**: Glassmorphism design with CSS gradients and backdrop-filter
- **Log Processing**: `tail -f` for file monitoring

## Features

### 🎨 **Beautiful UI**
- **Glassmorphism design** with frosted glass effects
- **Dark theme** with purple/blue gradients
- **Responsive layout** that works on all screen sizes
- **Smooth animations** and hover effects
- **Real-time statistics** display

### 📊 **Log Monitoring**
- **Real-time streaming** of magi logs via SSE
- **Log level filtering** (All, Info, Warn, Error)
- **Search functionality** across log messages
- **Auto-scroll** with manual scroll lock detection
- **Component extraction** from JSON metadata

### 🔧 **Error Handling**
- **No silent failures** - all parsing errors are visible
- **JSON parse error detection** with `[JSON PARSE FAILED]` markers
- **Broadcast error handling** with multiple fallback layers
- **Critical error catching** with detailed error messages
- **Data corruption protection**

## Server Configuration

### Port & Endpoints
```javascript
const PORT = 3002;

// Main endpoints
GET  /                    // Dashboard HTML
GET  /logs/stream         // SSE log stream
GET  /api/status         // Magi status API
GET  /health             // Server health check
```

### Log File Location
```javascript
const logFile = 'services/brainbridge/logs/brainbridge-default.log';
```

## Log Format Parsing

### Structured Logs
```
💡 2025-09-14T13:47:02.109-05:00 │ [INFO] │ Message │ {"component":"BrainProxyConnector","action":"heartbeat"}
```

### Parsing Logic
1. **ANSI code removal** - Strips color codes
2. **Regex matching** - Extracts timestamp, level, message, metadata
3. **JSON parsing** - Attempts to parse metadata as JSON
4. **Component extraction** - Enhances messages with `[Component]` prefixes
5. **Error handling** - Falls back gracefully on parse failures

### Error Cases Handled
- **Truncated JSON** → `[JSON PARSE FAILED]` marker
- **Invalid metadata** → Raw string with `[PARSE ERROR]`
- **Critical failures** → `PARSING ERROR: [details]`
- **Broadcast issues** → `BROADCAST ERROR: [details]`

## Dashboard JavaScript API

### Main Class
```javascript
class MagiDashboard {
  constructor() { /* Initialize dashboard */ }
  addLog(logData) { /* Add log to display */ }
  filterLogs() { /* Apply current filters */ }
  updateStats() { /* Update statistics display */ }
  scrollToBottom() { /* Auto-scroll management */ }
}
```

### Event Handling
- **EventSource connection** for SSE
- **Search input debouncing**
- **Scroll position detection**
- **Filter button management**

## Error Handling Architecture

### 3-Layer Error Protection

1. **Parse Level** (`parseLogLine`)
   ```javascript
   try { /* main parsing */ }
   catch { return { level: 'error', message: 'PARSING ERROR: ...' }; }
   ```

2. **Broadcast Level** (`broadcastLog`)
   ```javascript
   try { /* prepare data */ }
   catch { /* fallback error message */ }
   ```

3. **Critical Level** (Final fallback)
   ```javascript
   try { /* send fallback */ }
   catch { console.error('Even fallback failed'); }
   ```

### Error Message Types
- `[JSON PARSE FAILED]` - JSON metadata parsing failed
- `PARSING ERROR: [details]` - Critical parsing failure
- `BROADCAST ERROR: [details]` - SSE transmission failure
- `DATA PREP ERROR: [details]` - Data preparation failure

## Performance Considerations

### Message Limiting
- **Message content**: Max 1000 characters
- **Raw log data**: Max 1000 characters
- **Metadata**: Max 500 characters (if string)
- **Auto-cleanup**: Removes newlines/tabs for SSE safety

### Memory Management
- **Client tracking**: Automatic cleanup on disconnect
- **Buffer management**: Handles incomplete log lines
- **Process restart**: Auto-restart on log process failure

## Development Tips

### Debug Logging
```javascript
console.log('Parsing line:', cleanLine);
console.log('Broadcasting enhanced log:', logData);
console.log('⚠️ Broadcasting parsing error:', safeLogData.parsingError);
```

### Testing Error Handling
- Corrupt the log file to test parsing errors
- Kill the log process to test reconnection
- Send malformed JSON to test fallbacks

### Common Issues
1. **Port conflicts** - Change PORT if 3002 is occupied
2. **Log file missing** - Ensure `services/brainbridge/logs/brainbridge-default.log` exists
3. **CORS issues** - Server serves dashboard directly to avoid file:// protocol issues

## Future Enhancements

### Potential Features
- **Export logs** to files
- **Log retention** with configurable limits
- **Multiple log file** monitoring
- **Alert system** for error patterns
- **Performance metrics** tracking
- **User preferences** persistence

### Architecture Improvements
- **WebSocket upgrade** for bidirectional communication
- **Database logging** for persistence
- **Microservice architecture** for scalability
- **Authentication layer** for security

## Troubleshooting

### Dashboard Not Loading
1. Check server is running: `lsof -i :3002`
2. Verify log file exists: `ls services/brainbridge/logs/`
3. Check server logs for errors

### Logs Not Streaming
1. Verify magi is generating logs: `tail -f services/brainbridge/logs/brainbridge-default.log`
2. Check SSE connection in browser dev tools
3. Look for parsing errors in server console

### Performance Issues
1. Check message frequency - high-volume logs may need throttling
2. Monitor memory usage of dashboard process
3. Consider log rotation if files get too large

---

**Built with ❤️ for the MAGI system**