# Trace Mode Documentation

## Overview
Trace mode provides detailed logging with performance metrics for debugging and optimization.

## Usage

### Start Server in Trace Mode
```bash
npm run trace
```
This starts the dev server with `TRACE_MODE=true` environment variable.

### Watch Trace Logs
```bash
npm run trace:logs
```
This filters logs to show only trace, performance, and error messages.

### Regular Logs (All Messages)
```bash
npm run logs
```

### Clear Logs
```bash
npm run logs:clear
```

## Log Levels

### Standard Mode
- **INFO** - Basic operations (default)

### Trace Mode
- **[INFO]** - Basic operations
- **[TRACE]** - Detailed operation flow
- **[PERF]** - Performance timers
- **[ERROR]** - Errors

## Performance Metrics

When trace mode is enabled, you'll see:

### AI Categorization Performance
```
[PERF] Timer [ai_categorization]: 1823ms | {"model":"llama3.1:8b","promptLength":456,"responseLength":234}
```

### Memory Search Performance
```
[PERF] Timer [memory_search]: 45ms | {"foundCount":3,"searchQuery":"network debugging"}
```

### AI Synthesis Performance  
```
[PERF] Timer [ai_synthesis]: 3421ms | {"model":"llama3.1:8b","promptLength":2341,"responseLength":567,"memoryCount":3}
```

## Example Trace Output

```
2025-08-27T17:15:00.123Z: [INFO] AI Query request: "wifi", privacy=personal, limit=5
2025-08-27T17:15:00.124Z: [TRACE] Starting AI query operation | Data: {"question":"wifi","maxPrivacy":"personal","limit":5}
2025-08-27T17:15:00.125Z: [PERF] Timer started: memory_search
2025-08-27T17:15:00.189Z: [PERF] Timer [memory_search]: 64ms | {"foundCount":2,"searchQuery":"wifi"}
2025-08-27T17:15:00.190Z: [TRACE] Preparing context for AI synthesis | Data: {"memoryCount":2,"totalContextLength":1847}
2025-08-27T17:15:00.191Z: [PERF] Timer started: ai_synthesis
2025-08-27T17:15:03.544Z: [PERF] Timer [ai_synthesis]: 3353ms | {"model":"llama3.1:8b","promptLength":2156,"responseLength":423,"memoryCount":2}
2025-08-27T17:15:03.545Z: [INFO] AI Query successful: found 2 memories
```

## Performance Analysis

From the trace logs you can determine:
- **Search Speed**: How fast memories are found
- **AI Response Time**: How long the LLM takes to process
- **Bottlenecks**: Which operations are slowest
- **Memory Usage**: Number and size of memories being processed

## Tips

1. **Development**: Use trace mode during development to understand flow
2. **Production**: Turn off trace mode for production (performance overhead)
3. **Debugging**: Trace mode helps identify slow operations
4. **Optimization**: Use performance metrics to optimize prompt sizes

## Environment Variables

- `TRACE_MODE=true` - Enable trace mode
- `TRACE_MODE=false` or unset - Standard logging only

## Console Output

In trace mode, logs also appear in the console (stderr) prefixed with `[TRACE]` for real-time monitoring.