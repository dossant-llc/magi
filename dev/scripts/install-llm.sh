#!/bin/bash

set -e  # Exit on any error

echo "🤖 Installing Local LLM Components for AGIfor.me"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "This script is optimized for macOS. Some steps may need adjustment for other platforms."
fi

# Step 1: Check/Install Ollama
print_status "Checking for Ollama installation..."
if command -v ollama &> /dev/null; then
    print_success "Ollama is already installed"
    ollama --version
else
    print_status "Installing Ollama..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            print_status "Installing Ollama via Homebrew..."
            brew install ollama
        else
            print_status "Installing Ollama via curl..."
            curl -fsSL https://ollama.ai/install.sh | sh
        fi
    else
        print_status "Installing Ollama via curl..."
        curl -fsSL https://ollama.ai/install.sh | sh
    fi
    print_success "Ollama installed successfully"
fi

# Step 2: Start Ollama service (needed for pulling models)
print_status "Starting Ollama service..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # On macOS, ollama serve runs in background
    ollama serve &
    OLLAMA_PID=$!
    sleep 3  # Give it time to start
else
    # On Linux, might need systemd
    if systemctl is-active --quiet ollama; then
        print_success "Ollama service is already running"
    else
        print_status "Starting Ollama service..."
        ollama serve &
        OLLAMA_PID=$!
        sleep 3
    fi
fi

# Function to cleanup on exit
cleanup() {
    if [[ -n "$OLLAMA_PID" ]]; then
        print_status "Stopping Ollama service..."
        kill $OLLAMA_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Step 3: Pull required models
print_status "Pulling required LLM models (this may take a while)..."

print_status "Pulling llama3.1:8b (chat model) - ~4.7GB download..."
if ollama pull llama3.1:8b; then
    print_success "llama3.1:8b downloaded successfully"
else
    print_error "Failed to download llama3.1:8b"
    exit 1
fi

print_status "Pulling mxbai-embed-large (embeddings model) - ~669MB download..."
if ollama pull mxbai-embed-large; then
    print_success "mxbai-embed-large downloaded successfully"
else
    print_error "Failed to download mxbai-embed-large"
    exit 1
fi

# Step 4: Install Node.js dependencies
print_status "Installing Node.js dependencies for LLM functionality..."
cd brainbridge

# Check if package.json exists
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found in brainbridge directory"
    exit 1
fi

# Install LLM-related dependencies
print_status "Installing ollama, axios, and faiss-cpu..."
if npm install ollama axios faiss-cpu @types/node; then
    print_success "Node.js dependencies installed successfully"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

cd ..

# Step 5: Create directory structure for mAGIc
print_status "Creating directory structure for mAGIc..."
mkdir -p services/brainbridge/src/magic
mkdir -p .index

print_success "Directory structure created"

# Step 6: Test installation
print_status "Testing installation..."

# Test Ollama models
print_status "Testing llama3.1:8b model..."
if echo "Hello" | ollama run llama3.1:8b --no-stream > /dev/null 2>&1; then
    print_success "llama3.1:8b is working correctly"
else
    print_warning "llama3.1:8b test failed - may need manual verification"
fi

print_status "Testing mxbai-embed-large model..."
if echo "test" | ollama run mxbai-embed-large --no-stream > /dev/null 2>&1; then
    print_success "mxbai-embed-large is working correctly"
else
    print_warning "mxbai-embed-large test failed - may need manual verification"
fi

# Step 7: Display next steps
echo ""
echo "🎉 Local LLM Installation Complete!"
echo "==================================="
echo ""
print_success "Installed components:"
echo "  ✅ Ollama runtime"
echo "  ✅ llama3.1:8b (chat model)"
echo "  ✅ mxbai-embed-large (embeddings model)"
echo "  ✅ Node.js dependencies (ollama, axios, faiss-cpu)"
echo "  ✅ Directory structure for mAGIc"
echo ""
print_status "Next steps to complete mAGIc implementation:"
echo "  1. Implement the mAGIc CLI components in services/brainbridge/src/magic/"
echo "  2. Create the core files:"
echo "     - index.ts (CLI entry point)"
echo "     - embeddings.ts (vector indexing)"
echo "     - chat.ts (local LLM interactions)"
echo "     - search.ts (semantic search)"
echo "     - writers.ts (content generation)"
echo "  3. Extend BrainBridge MCP server with AI tools"
echo ""
print_status "To verify models are available:"
echo "  ollama list"
echo ""
print_status "To start using models manually:"
echo "  ollama run llama3.1:8b"
echo "  ollama run mxbai-embed-large"
echo ""
print_warning "Total disk space used: ~5.4GB for models"
echo ""