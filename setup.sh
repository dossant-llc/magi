#!/bin/bash

echo "🧠 Setting up AGIfor.me - Your Personal AI Memory Bank..."
echo ""

# Check if memories folder already exists
if [ -d "memories" ]; then
    echo "⚠️  memories/ folder already exists!"
    echo ""
    read -p "Do you want to overwrite it? [y/N]: " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Your existing memories are safe."
        exit 0
    fi
    echo "🗑️  Removing existing memories folder..."
    rm -rf memories
fi

# Copy sample structure
echo "📁 Creating your personal memories folder..."
cp -r memories.sample memories

# Remove any sensitive examples that shouldn't be in user's folder
echo "🧹 Cleaning up sample data..."
find memories -name "*.sample" -delete

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Your memory structure:"
echo "   memories/public/     🌍 Shareable with anyone"
echo "   memories/team/       👥 Work colleagues only"  
echo "   memories/personal/   🏠 Close friends/family"
echo "   memories/private/    🔒 Local AI only"
echo "   memories/sensitive/  🚨 Maximum protection"
echo ""
echo "🔒 Privacy protected:"
echo "   • Your memories/ folder is ignored by git"
echo "   • Personal information stays on your machine"
echo "   • You control what gets shared with AI assistants"
echo ""
echo "🚀 Ready to start:"
echo "   ./start.sh           # Start BrainBridge server"
echo "   ./start.sh --with-ui # Start with BrainKeeper dashboard"
echo ""
echo "💡 Add your first memory:"
echo '   Use the add_memory tool: "Always check WiFi network first when troubleshooting"'
echo ""