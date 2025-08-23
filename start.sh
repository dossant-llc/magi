#!/bin/bash

echo "🧠 Starting AGIfor.me - Your Personal AI Memory Bank..."
echo "💭 Memories directory: $(pwd)/memories"
echo "🔧 BrainBridge: search_memories, add_memory tools"
echo "🧠 BrainKeeper: http://localhost:3001"
echo "📝 Press Ctrl+C to stop"
echo ""

# Check if user wants to start both services
if [ "$1" = "--with-ui" ]; then
    echo "Starting BrainBridge and BrainKeeper..."
    npm run dev:all
else
    echo "Starting BrainBridge only (use --with-ui to start both)"
    npm run dev
fi