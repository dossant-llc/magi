#!/bin/bash

# Deploy Magi Exchange Server to configured server
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found"
    exit 1
fi

LOCAL_DIR="server"

echo "🚀 Deploying Magi Exchange Server to ${REMOTE_HOST}:${PORT}"

# Check if source directory exists
if [ ! -d "$LOCAL_DIR" ]; then
    echo "❌ Source directory $LOCAL_DIR not found"
    exit 1
fi

# Create remote directory
echo "📁 Creating remote directory..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR"

# Upload server files
echo "📤 Uploading server files..."
scp -r $LOCAL_DIR/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

# Install dependencies and set up service
echo "🔧 Setting up service..."
ssh "$REMOTE_USER@$REMOTE_HOST" << EOF
# Source nvm if available
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"

# Use node 18 if available, otherwise use system node
nvm use 18 2>/dev/null || true

cd $REMOTE_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create simple start script
cat > start.sh << 'SCRIPT'
#!/bin/bash
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
nvm use 18 2>/dev/null || true

PORT=$PORT node src/server.js > logs/server.log 2>&1 &
echo \$! > server.pid
echo "Server started with PID \$(cat server.pid)"
SCRIPT

# Create stop script
cat > stop.sh << 'SCRIPT'
#!/bin/bash
if [ -f server.pid ]; then
    PID=\$(cat server.pid)
    kill \$PID 2>/dev/null && echo "Server stopped (PID \$PID)" || echo "Server not running"
    rm server.pid
else
    echo "No PID file found"
fi
SCRIPT

# Make scripts executable
chmod +x start.sh stop.sh

# Create logs directory
mkdir -p logs

# Stop existing server if running
./stop.sh 2>/dev/null || true

# Start the server
echo "🎯 Starting service..."
./start.sh

# Give it a moment to start
sleep 2

# Check if it's running
if [ -f server.pid ] && ps -p \$(cat server.pid) > /dev/null; then
    echo "✅ Service started on port $PORT"
else
    echo "❌ Failed to start service"
    exit 1
fi
EOF

echo ""
echo "✨ Magi Exchange Server deployed!"
echo ""
echo "📍 Server Info:"
echo "   URL: ws://${AGIFORME_SERVER_DOMAIN:-$REMOTE_HOST}:$PORT"
echo "   Logs: tail -f $REMOTE_DIR/logs/server.log (via SSH)"
echo ""
echo "🔗 Test connection:"
echo "   wscat -c ws://${AGIFORME_SERVER_DOMAIN:-$REMOTE_HOST}:$PORT"