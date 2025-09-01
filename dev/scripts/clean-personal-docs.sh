#!/bin/bash

# Script to clean personal server references from documentation
echo "🔄 Cleaning personal server references from documentation..."

# Define patterns to clean
PERSONAL_USER="igoram2"
PERSONAL_SERVER="vps34824.dreamhostps.com"
GENERIC_USER="your-username"
GENERIC_SERVER="your-server.com"

# Clean braincloud README
if [ -f "services/braincloud/README.md" ]; then
    echo "📝 Cleaning services/braincloud/README.md"
    sed -i '' "s|$PERSONAL_USER|$GENERIC_USER|g" "services/braincloud/README.md"
    sed -i '' "s|$PERSONAL_SERVER|$GENERIC_SERVER|g" "services/braincloud/README.md"
    sed -i '' "s|/home/igoram2|/home/$GENERIC_USER|g" "services/braincloud/README.md"
fi

echo "✅ Documentation cleanup complete!"