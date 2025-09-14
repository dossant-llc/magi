# Brain Proxy Heartbeat Stale Connection Bug

**Date Identified:** 2025-09-14
**Severity:** Medium
**Impact:** False disconnections from Brain Proxy cloud service

## Symptoms

- Brain Proxy cloud service shows connections as having "782+ minutes since activity"
- Client-side shows connection as active and healthy
- Local queries work fine, but external access through Brain Proxy fails
- System restart temporarily fixes the issue

## Expected Behavior

- Server-side heartbeat runs every 30 seconds updating `connector.lastSeen = Date.now()`
- Stale timeout is 5 minutes, so connections should never show more than 30 seconds inactivity
- `minutesSinceActivity` should stay low (< 1 minute) for active connections

## Investigation

### Server-Side Code Analysis (brainproxy.js)

**Heartbeat Logic (Lines 801-811):**
```javascript
const heartbeatInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    const connector = this.connectors.get(route);
    if (connector) {
      connector.lastSeen = Date.now(); // Should update every 30s
      ws.ping();
    }
  }
}, 30000);
```

**Stale Cleanup (Lines 29-40):**
```javascript
const staleTimeout = 5 * 60 * 1000; // 5 minutes
for (const [route, connector] of this.connectors) {
  if (now - connector.lastSeen > staleTimeout) {
    // Terminate stale connection
  }
}
```

### Client-Side Code Analysis (brain-proxy-connector.ts)

**Ping Response (Lines 123-127):**
```javascript
this.ws.on('ping', () => {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.pong();
  }
});
```

**Activity Tracking (Lines 24, 78, 180):**
```javascript
private lastActivityTime = Date.now();
// Updated on connection and message receipt
```

## Theories for Root Cause

1. **Heartbeat Interval Clearing**: The `setInterval` is being cleared prematurely but WebSocket remains open
2. **Connector Deletion**: `this.connectors.get(route)` returns null while connection persists
3. **WebSocket State Mismatch**: `ws.readyState !== WebSocket.OPEN` despite functional connection
4. **Memory/Reference Issues**: Connector object becomes detached from the Map
5. **Process Suspension**: Cloud service process getting paused/throttled, stopping intervals

## Workaround

- Run `magi restart` to re-establish connection
- Monitor logs for "Brain Proxy heartbeat" entries showing fresh activity
- Connection typically works fine after restart

## Next Steps for Investigation

1. Add debug logging to server-side heartbeat interval
2. Log when connectors are deleted vs when intervals are cleared
3. Monitor WebSocket readyState changes
4. Add server-side connection health diagnostics
5. Consider adding client-initiated keepalive as backup

## Files Involved

- `/services/braincloud/brainproxy/brainproxy.js` (server-side)
- `/services/brainbridge/src/services/brain-proxy-connector.ts` (client-side)

## Related Issues

- ChatGPT queries failing due to "brain offline" when connection is actually healthy
- False positive disconnection alerts in Brain Proxy logs