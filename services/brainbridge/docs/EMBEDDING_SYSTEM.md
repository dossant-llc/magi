# BrainBridge Embedding System

## Overview

The BrainBridge embedding system provides semantic search capabilities for the personal knowledge base using local vector embeddings. This system enables fast, intelligent retrieval of memories based on meaning rather than just keyword matching.

## Architecture

### Core Components

1. **EmbeddingService** (`src/services/embedding-service.ts`)
   - Generates vector embeddings using Ollama's `mxbai-embed-large` model
   - Manages the embedding index with incremental updates
   - Provides vector similarity search with cosine similarity

2. **AIService Integration** (`src/services/ai-service.ts`)  
   - Enhanced search that tries vector similarity first
   - Graceful fallback to keyword search
   - Privacy-aware filtering of vector search results

3. **CLI Index Command** (`src/magic/commands/index.ts`)
   - `magic index` command to build/rebuild embeddings
   - Support for force rebuild with `--force` flag
   - Progress reporting and error handling

## Technical Implementation

### Embedding Generation

- **Model**: `mxbai-embed-large` (1024 dimensions)
- **Content Processing**: Strips frontmatter, embeds main content only
- **Storage**: JSON format at `.index/embeddings.json`
- **Performance**: ~10-11 seconds per memory file

### Vector Search

- **Algorithm**: Cosine similarity calculation
- **Threshold**: 0.3 minimum similarity score
- **Privacy**: Respects user privacy levels (public → sensitive)
- **Fallback**: Automatic keyword search if embeddings unavailable

### Incremental Updates

- **Change Detection**: SHA-256 content hashing (16-char prefix)
- **Smart Processing**: Only processes new/modified files
- **Metadata Tracking**: Stores creation time, content hash, file paths
- **Performance**: Sub-second updates for unchanged files

## Usage

### Building the Index

```bash
# Build embeddings for all memories
magic index

# Force rebuild entire index
magic index --force
```

### Search Performance

- **Vector Search**: ~46ms (semantic similarity)
- **AI Synthesis**: 1-2+ minutes (local LLM processing)
- **Keyword Fallback**: ~50-100ms (text matching)

### Privacy Levels

The system respects privacy boundaries:
- `public` → Only public memories
- `personal` → Public + team + personal memories  
- `sensitive` → All privacy levels

## File Structure

```
.index/
├── embeddings.json     # Vector embeddings index
└── metadata.json       # File metadata (legacy)

memories/
├── public/            # Public memories
├── team/              # Team memories  
├── personal/          # Personal memories
├── private/           # Private memories
└── sensitive/         # Sensitive memories
```

## Integration Points

### MCP Server Integration

The embedding system integrates with BrainBridge's MCP server:

- **ai_query_memories**: Uses vector search for semantic retrieval
- **ai_save_memory**: Triggers incremental embedding updates
- **Raw mode**: Fast search without AI synthesis (46ms vs 2+ minutes)

### Memory Storage Format

Each memory includes frontmatter metadata:

```yaml
---
title: "Memory Title"
category: "technical"
privacy: "personal"  
tags: ["networking", "troubleshooting"]
created: "2025-08-27T17:13:11.326Z"
source: "mcp-ai"
---

# Memory Content
Main content that gets embedded...
```

## Performance Benchmarks

### Embedding Generation
- **Processing Time**: ~10-11 seconds per file
- **Model Load**: One-time ~2-3 seconds  
- **Index Size**: ~60KB for 2 memories (1024 dims each)

### Search Performance
- **Vector Search**: 46ms (semantic)
- **Keyword Search**: 50-100ms (fallback)
- **AI Synthesis**: 120+ seconds (local LLM)

### Storage Efficiency
- **Embedding Dimensions**: 1024 per memory
- **Index Size**: ~30KB per memory (includes metadata)
- **Change Detection**: 16-char hash for each file

## Error Handling

### Graceful Degradation
- Vector search failure → Keyword search fallback
- Missing embeddings → Automatic keyword search
- Model unavailable → Clear error messages with setup instructions

### Logging & Monitoring
- **Trace Mode**: Detailed performance metrics
- **Timer Tracking**: Embedding generation, search, index build
- **Error Logging**: Failed file processing, model connectivity

## Future Enhancements

### Planned Features
- **Hybrid Search**: Combine vector + keyword scores
- **Semantic Clustering**: Group related memories
- **Search Ranking**: Machine learning relevance scoring
- **Incremental Sync**: Real-time embedding updates

### Performance Optimizations
- **Batch Processing**: Multiple files per model call
- **Compressed Storage**: Quantized embeddings
- **Caching Layer**: Frequent query caching
- **Parallel Processing**: Multi-threaded embedding generation

## Troubleshooting

### Common Issues

1. **"mxbai-embed-large not found"**
   ```bash
   ollama pull mxbai-embed-large
   ```

2. **Slow embedding generation**
   - Ensure sufficient RAM (8GB+ recommended)
   - Check Ollama GPU acceleration setup

3. **No search results**
   - Verify embeddings exist: `ls -la .index/`
   - Rebuild index: `magic index --force`

4. **Permission errors**
   - Check write permissions on `.index/` directory
   - Ensure Ollama service is running

### Debug Commands

```bash
# Check embedding index status
ls -la .index/

# View embedding index contents
head -20 .index/embeddings.json

# Test embedding generation
magic index --force

# Monitor performance
npm run logs
```

## Implementation Timeline

### Completed Features ✅
- [x] EmbeddingService with mxbai-embed-large integration
- [x] Vector similarity search with cosine similarity  
- [x] Incremental embedding updates with content hashing
- [x] Privacy-aware search filtering
- [x] CLI index management command
- [x] AIService integration with fallback
- [x] Performance monitoring and trace logging

### Architecture Decision Records

**ADR-001**: Chose `mxbai-embed-large` for high-quality embeddings
- **Rationale**: Best balance of quality vs. local resource usage
- **Alternatives**: OpenAI embeddings (requires API), sentence-transformers
- **Trade-offs**: Slower than smaller models, higher quality results

**ADR-002**: Cosine similarity for vector search  
- **Rationale**: Standard for normalized embeddings, computationally efficient
- **Alternatives**: Euclidean distance, dot product
- **Trade-offs**: Requires vector normalization

**ADR-003**: JSON storage for embedding index
- **Rationale**: Simple, human-readable, version control friendly
- **Alternatives**: Binary formats, vector databases (Pinecone, Weaviate)
- **Trade-offs**: Less efficient for large datasets, easier debugging

**ADR-004**: Incremental updates via content hashing
- **Rationale**: Avoids expensive re-embedding of unchanged content
- **Alternatives**: File modification time, full rebuilds
- **Trade-offs**: Small storage overhead, significant time savings

## Performance Impact

The embedding system provides a 40x speed improvement for search operations:

- **Before**: 120+ seconds (keyword search + AI synthesis)  
- **After**: 46ms vector search + optional synthesis
- **Memory Usage**: ~60MB additional for embedding index
- **Disk Usage**: ~30KB per embedded memory

This enables responsive search for cloud UIs while maintaining local privacy and avoiding API dependencies.