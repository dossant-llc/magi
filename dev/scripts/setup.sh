#!/bin/bash

echo "🧠 Setting up AGIfor.me - Your Personal AI Memory Bank..."
echo ""

# Simple memory location logic
if [ -f ".env" ] && grep -q "MEMORIES_LOCATION=documents" ".env"; then
    MEMORIES_DIR="$HOME/Documents/memories"
    echo "📁 Using Documents location: $MEMORIES_DIR"
elif [ -f ".env" ] && grep -q "MEMORIES_DIR=" ".env"; then
    MEMORIES_DIR=$(grep "MEMORIES_DIR=" .env | cut -d'=' -f2)
    echo "📁 Using custom location: $MEMORIES_DIR"  
else
    MEMORIES_DIR="./data/memories/profiles/default"
    echo "📁 Using project location: $MEMORIES_DIR"
fi
echo ""

# Check if memories folder already exists
if [ -d "$MEMORIES_DIR" ]; then
    echo "⚠️  Memories folder already exists at $MEMORIES_DIR!"
    echo ""
    read -p "Do you want to overwrite it? [y/N]: " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Your existing memories are safe."
        exit 0
    fi
    echo "🗑️  Removing existing memories folder..."
    rm -rf "$MEMORIES_DIR"
fi

# Create parent directory if needed
mkdir -p "$(dirname "$MEMORIES_DIR")"

# Copy sample structure
echo "📁 Creating your personal memories folder..."
cp -r data/memories/sample/* "$MEMORIES_DIR"

# Remove any sensitive examples that shouldn't be in user's folder
echo "🧹 Cleaning up sample data..."
find "$MEMORIES_DIR" -name "*.sample" -delete

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Your memory structure at $MEMORIES_DIR:"
echo "   public/     🌍 Shareable with anyone"
echo "   team/       👥 Work colleagues only"  
echo "   personal/   🏠 Close friends/family"
echo "   private/    🔒 Local AI only"
echo "   sensitive/  🚨 Maximum protection"
echo ""
echo "🔒 Privacy protected:"
echo "   • Your memories/ folder is ignored by git"
echo "   • Personal information stays on your machine"
echo "   • You control what gets shared with AI assistants"
echo ""
echo "⚙️ Configuration:"
if [ ! -f ".env" ]; then
    echo "   Creating .env configuration from template..."
    cp .env.template .env
    echo "   ✅ Created .env (defaults to project location)"
    echo "   💡 Edit .env and change MEMORIES_LOCATION=documents for ~/Documents/"
else
    echo "   📝 Using existing .env configuration"
fi
echo ""
echo "🚀 Ready to start:"
echo "   ./start.sh           # Start BrainBridge server"
echo "   ./start.sh --with-ui # Start with BrainKeeper dashboard"
echo ""
echo "💡 Add your first memory:"
echo '   Use the add_memory tool: "Always check WiFi network first when troubleshooting"'
echo ""
echo "🔧 Manage configuration:"
echo "   npm run mem:path     # Check memory location"
echo "   edit .env           # Customize all settings"
echo ""