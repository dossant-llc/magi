#!/bin/bash
# Deploy BrainCloud to DreamHost server
set -e

echo "🚀 Deploying BrainCloud v0.1.2 to production server..."

# Server configuration
REMOTE_USER="igoram2"
REMOTE_HOST="vps34824.dreamhostps.com"
REMOTE_DIR="/home/igoram2/your-server.com/braincloud"

# Files to exclude from deployment
EXCLUDE_FILES="node_modules/ .git/ logs/ *.log .env.local .env.development"

echo "📁 Creating remote directory structure..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR/brainproxy"

echo "📤 Uploading BrainCloud files..."
rsync -avz --delete \
  --exclude="node_modules/" \
  --exclude=".git/" \
  --exclude="*.log" \
  --exclude=".env.local" \
  ./ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "📦 Installing dependencies on remote server..."
ssh "$REMOTE_USER@$REMOTE_HOST" "
  source ~/.nvm/nvm.sh &&
  cd $REMOTE_DIR &&
  npm install --production
"

echo "🛑 Stopping existing BrainCloud service..."
ssh "$REMOTE_USER@$REMOTE_HOST" "
  pkill -f 'node.*server.js' || true
  sleep 2
" 

echo "🚀 Starting BrainCloud service..."
ssh "$REMOTE_USER@$REMOTE_HOST" "
  source ~/.nvm/nvm.sh &&
  cd $REMOTE_DIR &&
  nohup node server.js > braincloud.log 2>&1 &
  echo 'BrainCloud started in background'
"

echo "⏳ Waiting for service to start..."
sleep 5

echo "🔍 Verifying deployment..."
if curl -s -f "https://hub.m.agifor.me/api/status" > /dev/null; then
  echo "✅ BrainCloud deployment successful!"
  echo "🌐 Service available at: https://hub.m.agifor.me/"
  echo "🧠 Brain Proxy: https://hub.m.agifor.me/bp/health"
  echo "🤖 MCP Endpoint: http://hub.m.agifor.me:9025/bp/mcp"
else
  echo "❌ Deployment verification failed"
  echo "📋 Checking logs..."
  ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && tail -20 braincloud.log"
  exit 1
fi

echo "🎉 Deployment complete! New MCP endpoint ready for Claude.ai"