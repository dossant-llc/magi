#!/bin/bash

echo "🧠 BrainBridge Local - Quick Start"
echo "=================================="
echo ""

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✅ Ollama is running"
else
  echo "❌ Ollama is not running!"
  echo "   Please start it with: ollama serve"
  echo "   Then run this script again."
  exit 1
fi

# Check for required models
echo ""
echo "📦 Checking AI models..."
models=$(curl -s http://localhost:11434/api/tags | grep -E "(llama3.1:8b|mxbai-embed-large)" | wc -l)

if [ "$models" -lt 2 ]; then
  echo "⚠️  Missing required models. Installing..."
  echo "   This may take a few minutes..."
  
  echo "   Pulling llama3.1:8b..."
  ollama pull llama3.1:8b
  
  echo "   Pulling mxbai-embed-large..."
  ollama pull mxbai-embed-large
  
  echo "✅ Models installed!"
else
  echo "✅ All required models found"
fi

# Build BrainBridge if needed
echo ""
echo "🔨 Checking BrainBridge build..."
if [ ! -d "../services/brainbridge/dist" ]; then
  echo "   Building BrainBridge..."
  cd ../services/brainbridge
  npm run build
  cd ../brainbridge-local
  echo "✅ BrainBridge built!"
else
  echo "✅ BrainBridge already built"
fi

# Install dependencies if needed
echo ""
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "   Installing dependencies..."
  npm install
  echo "✅ Dependencies installed!"
else
  echo "✅ Dependencies already installed"
fi

echo ""
echo "🚀 Starting BrainBridge Local Network..."
echo ""
echo "   Instances will start on:"
echo "   - Alice: http://localhost:8147"
echo "   - Bob:   http://localhost:8148"
echo "   - Carol: http://localhost:8149"
echo ""
echo "   Dashboard will open at:"
echo "   - http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================="
echo ""

# Start everything
npm run dev