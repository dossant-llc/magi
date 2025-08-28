# BrainBridge Local Network - Requirements Document

## Overview
BrainBridge Local Network is a local development environment for running multiple AI brain instances (Alice, Bob, Carol) that can store and retrieve memories independently while providing a unified management interface.

## Core Architecture

### 1. Brain Instances
- **Three Independent Brains**: Alice, Bob, Carol
- **Separate Memory Storage**: Each brain maintains its own isolated memory directory
  - Alice: `/memories.alice/`
  - Bob: `/memories.bob/` 
  - Carol: `/memories.carol/`
- **Individual MCP Servers**: Each runs on separate ports (8147, 8148, 8149)
- **Privacy Levels**: Each brain supports 5 privacy levels (public, team, personal, private, sensitive)

### 2. Memory System
- **AI-Powered Categorization**: Automatic tagging and categorization on save
- **Vector Search**: Semantic similarity search using local Ollama embeddings
- **Keyword Fallback**: Text-based search when vector search fails
- **Isolation**: Each brain can only access its own memories by default

### 3. Terminal Interface
- **Individual Terminals**: Each brain has its own terminal interface in the dashboard
- **Natural Language Commands**: Support for conversational queries
- **Auto-Routing**: `magi, does @alice like sushi?` routes to Alice's brain
- **Command Support**: 
  - `help` - Show available commands
  - `query [question]` - Search memories
  - `save [content]` - Save to memory
  - Direct natural language input

### 4. Dashboard Interface
- **Real-Time Monitoring**: Live status of all brain instances
- **Memory Metrics**: Count and size statistics per brain and privacy level
- **System Console**: Live log streaming showing service activity (AI saves, queries, connections)
- **Terminal Access**: Interactive terminals for each brain
- **Professional Design**: Terminal-style dark theme interface

## Technical Requirements

### 1. Dependencies
- **Ollama**: Local LLM service for AI processing and embeddings
- **Node.js**: JavaScript runtime for all services
- **TypeScript**: Type-safe development
- **Express**: Web server framework

### 2. Services
- **Launcher**: Manages starting/stopping all brain instances
- **Dashboard**: Web interface at http://localhost:3000
- **Brain Instances**: Individual MCP servers for each brain
- **BrainXchange**: Network coordination service

### 3. Data Flow
1. User input via dashboard terminal → Brain instance
2. Brain processes query/save → AI service 
3. AI service → Ollama for processing/embeddings
4. Results stored in brain-specific memory directory
5. Live logs streamed to dashboard console

## User Experience Requirements

### 1. Dashboard Features
- **Status Indicators**: Online/offline status for each brain
- **Memory Statistics**: Real-time counts and sizes
- **Live Console**: Stream of service logs with timestamps and brain identification
- **Interactive Terminals**: One per brain with command history
- **Responsive Design**: Works well in browser

### 2. Memory Management
- **Automatic Saving**: AI categorizes and saves with metadata
- **Smart Search**: Vector similarity with keyword fallback
- **Privacy Aware**: Respects privacy level boundaries
- **Persistent Storage**: Memories survive service restarts

### 3. Development Workflow
- **Single Command Start**: `npm run start` launches everything
- **Hot Reload**: Dashboard updates reflect service changes
- **Error Handling**: Graceful fallbacks when services fail
- **Logging**: Comprehensive logs for debugging

## Success Criteria

### 1. Core Functionality
- ✅ Each brain can save memories independently
- ✅ Each brain can search its own memories
- ✅ Dashboard shows real-time status and metrics
- ✅ Live console streaming works
- ✅ Memory search works (vector + fallback)

### 2. User Interface
- ✅ Professional terminal-style design
- ✅ Individual terminals for each brain
- ✅ Auto-routing between brains works
- ✅ Real-time log streaming visible

### 3. System Integration
- ✅ All services start with single command
- ✅ Proper error handling and fallbacks
- ✅ Memory isolation between brains
- ✅ Ollama integration for AI processing

## Current Implementation Status

### ✅ Completed
- Brain instance isolation and individual memory directories
- Dashboard with live log streaming via Server-Sent Events
- Memory search with vector similarity and keyword fallback
- Auto-routing terminal commands between brains
- Real-time metrics and status monitoring
- Professional dark terminal-style UI

### ⚠️ Known Issues
- Vector search sometimes fails, relies on keyword fallback
- Embedding generation may not be triggering consistently
- Memory cross-brain queries need explicit routing

### 🎯 Next Steps (if needed)
- Improve vector search reliability
- Enhanced error handling and user feedback
- Performance optimization for large memory sets
- Additional terminal commands and features

## Architecture Decisions

1. **Memory Isolation**: Each brain has its own directory to prevent cross-contamination
2. **Fallback Search**: Vector search fails gracefully to keyword search
3. **Live Streaming**: SSE for real-time dashboard updates
4. **Local-First**: All AI processing happens locally via Ollama
5. **Modular Design**: Each brain is an independent service

This document serves as the single source of truth for what BrainBridge Local Network should be and do.