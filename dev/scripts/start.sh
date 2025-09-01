#!/bin/bash

echo "🧠 Starting AGIfor.me - Your Personal AI Memory Bank..."
echo "💭 Memories directory: $(pwd)/data/memories/profiles/default"
echo "🔧 BrainBridge: search_memories, add_memory tools"
echo "🧠 BrainKeeper: http://localhost:3001"
echo "📝 Press Ctrl+C to stop"
echo ""

# Check if user wants to start both services
if [ "$1" = "--with-ui" ]; then
    echo "Starting BrainBridge and BrainKeeper..."
    echo "💡 UI will be available at http://localhost:3001"
    npm run dev:ui &
    npm run dev
else
    echo "Starting BrainBridge only (use --with-ui for dashboard UI)"
    echo "💡 Run 'npm run diag' in another terminal to check status"
    npm run dev
fi