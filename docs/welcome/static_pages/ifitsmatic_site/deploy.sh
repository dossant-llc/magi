#!/bin/bash

# If It's Magic Website Deployment Script
# Deploys the manifesto site to Dreamhost server

set -e  # Exit on any error

echo "✨ ========================================"
echo "   If It's Magic - Website Deployment"
echo "   ========================================"

# Configuration
REMOTE_USER=${REMOTE_USER:-"agiforme"}
REMOTE_HOST=${REMOTE_HOST:-"vps34824.dreamhostps.com"}  
REMOTE_DIR=${REMOTE_DIR:-"/home/agiforme/ifitsmagic.com"}
SITE_NAME="ifitsmagic.com"

echo "📍 Target: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
echo "🌐 Site: ${SITE_NAME}"
echo ""

# Check if required files exist
if [ ! -f "public/index.html" ]; then
    echo "❌ Error: public/index.html not found. Run from ifitsmatic_site directory."
    exit 1
fi

if [ ! -f "config/config.php" ]; then
    echo "❌ Error: config/config.php not found."
    exit 1
fi

echo "📦 Preparing deployment package..."

# Create temporary deployment directory
TEMP_DIR=$(mktemp -d)
echo "   Using temp directory: ${TEMP_DIR}"

# Copy files to temp directory
cp -r . "${TEMP_DIR}/"

# Remove unnecessary files
rm -f "${TEMP_DIR}/deploy.sh" 2>/dev/null || true
rm -f "${TEMP_DIR}/.DS_Store" 2>/dev/null || true
rm -rf "${TEMP_DIR}/.git" 2>/dev/null || true

echo "✅ Package prepared"

echo "🚀 Deploying to Dreamhost server..."

# Create remote directory if it doesn't exist
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"

# Deploy full structure including public folder
rsync -avz \
    --exclude 'deploy.sh' \
    --exclude '.DS_Store' \
    --exclude '.git' \
    "${TEMP_DIR}/" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "✅ Files uploaded"

echo "🔧 Setting up website on remote server..."

# SSH into remote server and setup
ssh "${REMOTE_USER}@${REMOTE_HOST}" << EOF
set -e

echo "🌐 Setting up If It's Magic website on remote server..."

cd ${REMOTE_DIR}

# Set proper permissions for web files
echo "🔒 Setting file permissions..."
find . -type f -name "*.html" -exec chmod 644 {} \;
find . -type f -name "*.css" -exec chmod 644 {} \;
find . -type f -name "*.js" -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Verify the main files exist
if [ -f "public/index.html" ]; then
    echo "✅ index.html deployed successfully in public folder"
else
    echo "❌ index.html not found in public folder after deployment"
    exit 1
fi

if [ -f "config/config.php" ]; then
    echo "✅ config.php deployed successfully (outside public folder)"
else
    echo "❌ config.php not found after deployment"
    exit 1
fi

echo "🌟 If It's Magic website setup complete!"
echo ""
echo "📄 Deployed files:"
ls -la

EOF

# Clean up temp directory
rm -rf "${TEMP_DIR}"

echo ""
echo "🎉 If It's Magic Website Deployment Complete!"
echo ""
echo "🔗 Website should be accessible at:"
echo "   https://ifitsmagic.com"
echo "   http://ifitsmagic.com"
echo ""
echo "🧪 Quick Tests:"
echo "   curl -I https://ifitsmagic.com"
echo "   curl -s https://ifitsmagic.com | head -n 20"
echo ""
echo "📊 Monitor deployment:"
echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'ls -la ${REMOTE_DIR}/'"
echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'cat ${REMOTE_DIR}/index.html | head -n 10'"
echo ""
echo "🔧 File Management:"
echo "   Upload:  rsync -avz ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
echo "   List:    ssh ${REMOTE_USER}@${REMOTE_HOST} 'ls -la ${REMOTE_DIR}/'"
echo "   Edit:    ssh ${REMOTE_USER}@${REMOTE_HOST} 'nano ${REMOTE_DIR}/index.html'"
echo ""
echo "✨ If it's magic, it belongs to us!"