#!/bin/bash

# Script to replace hardcoded m3u.dossant.com with example domains in documentation
echo "🔄 Updating documentation files to remove hardcoded domains..."

# Define replacement patterns
ORIGINAL_DOMAIN="m3u.dossant.com"
EXAMPLE_DOMAIN="your-server.com"
EXAMPLE_WEBSOCKET="wss://your-server.com"
EXAMPLE_HTTP="https://your-server.com"

# Find all documentation files and update them
find . -name "*.md" -type f | while read file; do
    if grep -q "$ORIGINAL_DOMAIN" "$file"; then
        echo "📝 Updating: $file"
        
        # Create a backup
        cp "$file" "$file.backup"
        
        # Replace all instances
        sed -i '' "s|wss://$ORIGINAL_DOMAIN|$EXAMPLE_WEBSOCKET|g" "$file"
        sed -i '' "s|ws://$ORIGINAL_DOMAIN|ws://$EXAMPLE_DOMAIN|g" "$file"
        sed -i '' "s|https://$ORIGINAL_DOMAIN|$EXAMPLE_HTTP|g" "$file"
        sed -i '' "s|http://$ORIGINAL_DOMAIN|http://$EXAMPLE_DOMAIN|g" "$file"
        sed -i '' "s|$ORIGINAL_DOMAIN|$EXAMPLE_DOMAIN|g" "$file"
        
        echo "   ✅ Updated $file"
    fi
done

echo ""
echo "✨ Documentation update complete!"
echo "💡 All instances of '$ORIGINAL_DOMAIN' have been replaced with '$EXAMPLE_DOMAIN'"
echo "🔍 Use environment variable AGIFORME_SERVER_DOMAIN to configure your actual domain"