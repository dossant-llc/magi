#!/bin/bash

# Kill all AGIfor.me related processes
echo "🔪 Killing all AGIfor.me processes..."

# Kill BrainBridge processes (both stdio and http modes)
echo "Stopping BrainBridge..."
pkill -f "services/brainbridge/src/server.ts" 2>/dev/null
pkill -f "tsx.*server.ts" 2>/dev/null

# Kill any processes using our ports
echo "Freeing up ports..."
lsof -ti:8147 | xargs kill -9 2>/dev/null  # BrainBridge HTTP
lsof -ti:8082 | xargs kill -9 2>/dev/null  # BrainXchange server

# Kill any remaining tsx watch processes
echo "Stopping tsx watch processes..."
pkill -f "tsx --watch" 2>/dev/null

# Kill npm processes that might be hanging
echo "Stopping npm dev processes..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm run start" 2>/dev/null

# Kill any Node.js processes with our project paths
echo "Cleaning up Node.js processes..."
pkill -f "agiforme" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Check what's still running
echo ""
echo "🔍 Checking for remaining processes..."
REMAINING=$(ps aux | grep -E "(brainbridge|tsx.*server|agiforme)" | grep -v grep | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ All processes terminated successfully"
else
    echo "⚠️  $REMAINING processes still running:"
    ps aux | grep -E "(brainbridge|tsx.*server|agiforme)" | grep -v grep
    echo ""
    echo "💀 Force killing remaining processes..."
    ps aux | grep -E "(brainbridge|tsx.*server|agiforme)" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
fi

echo ""
echo "🧹 Cleanup complete!"
echo "You can now safely run 'npm run dev' again"