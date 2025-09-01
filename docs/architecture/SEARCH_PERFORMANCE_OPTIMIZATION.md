# Search Performance Optimization Plan

## Current Performance Analysis

### Observed Timings
- **Vector search**: 36-77ms ✅ (excellent)
- **Raw mode queries**: 1-2s ⚠️ (could be better)
- **Local mode queries**: 8-12s ⚠️ (LLM synthesis bottleneck)
- **E2E search**: 146ms ✅ (good)

### Current Architecture Issues

1. **Full File Returns**: Raw mode returns entire markdown files (inefficient for large memories)
2. **Post-Search File I/O**: After vector search, system reads files from disk instead of using indexed data
3. **No Content Chunking**: Large memories return as single blocks instead of relevant sections

## Optimization Approaches

### Approach 1: Index-First Architecture (Quick Win)
**Current Flow:**
```
Query → Vector Search → Read Files from Disk → Return Full Files
```

**Optimized Flow:**
```
Query → Vector Search → Return from Index Cache → Optional Full File
```

**Benefits:**
- Eliminate file I/O for most queries
- Sub-100ms raw mode performance
- Use existing index data structure

**Changes Required:**
- Modify `searchSimilar()` to return index metadata + content preview
- Add `contentPreview` field to `MemoryEmbedding` interface
- Update raw mode to use index data

### Approach 2: Content Chunking (Medium Term)
**Strategy:** Break large memories into semantic chunks during indexing

**Implementation:**
- Split content by headings (`## Summary`, `## Content`, etc.)
- Index each chunk separately with shared metadata
- Return most relevant chunks instead of full files

**Benefits:**
- More precise search results
- Faster response times
- Better context relevance

### Approach 3: Hybrid Snippet Generation (Advanced)
**Strategy:** Generate contextual snippets around search matches

**Implementation:**
- Extract 2-3 sentences around keyword matches
- Use LLM for intelligent snippet generation
- Fallback to simple text extraction

**Benefits:**
- Highly relevant content previews
- Maintains context
- Scalable for large knowledge bases

## Implementation Path

### Phase 1: Index-First (Immediate - 1-2 hours)
```typescript
interface MemoryEmbedding {
  // ... existing fields
  contentPreview: string;  // First 200 chars or summary
  excerpts: string[];      // Key sections
}
```

**Target Performance:**
- Raw mode: 50-100ms (10-20x improvement)
- Maintain all existing functionality

### Phase 2: Smart Chunking (1-2 days)
- Implement content chunking during index build
- Modify search to return relevant chunks
- Add chunk-level metadata

**Target Performance:**
- Raw mode: 30-50ms
- Higher relevance scores

### Phase 3: Advanced Snippets (1 week)
- LLM-powered snippet generation
- Context-aware excerpt extraction
- Dynamic content summarization

**Target Performance:**
- Raw mode: 20-30ms
- Professional-grade search experience

## Testing Strategy

### Performance Benchmarks
Create comprehensive performance test suite:

```bash
npm run perf:search      # Test search performance
npm run perf:index       # Test indexing performance  
npm run perf:compare     # Compare approaches
npm run perf:memory      # Memory usage analysis
```

### Test Scenarios
1. **Small memories** (< 500 chars)
2. **Medium memories** (500-2000 chars)
3. **Large memories** (> 2000 chars)
4. **Query variations** (short, long, complex)
5. **Concurrent queries** (load testing)

### Success Metrics
- Raw mode < 100ms (target: 50ms)
- No degradation in search relevance
- Memory usage stays reasonable
- Index rebuild time acceptable

## Risk Assessment

### Low Risk
- Index-first approach (uses existing data)
- Backward compatibility maintained
- Gradual rollout possible

### Medium Risk
- Content chunking may affect relevance
- Index size increase with chunking
- Complex memories may need special handling

### High Risk
- LLM snippet generation adds complexity
- Performance regression if not implemented carefully
- User experience changes require testing

## Next Steps

1. **Immediate**: Implement Phase 1 (index-first)
2. **Test**: Add performance test scripts
3. **Measure**: Compare before/after metrics
4. **Iterate**: Optimize based on real usage data
5. **Scale**: Move to Phase 2 when Phase 1 is stable

## Performance Test Script Design

```bash
# Test current performance baseline
npm run perf:baseline

# Test with different approaches
npm run perf:index-first
npm run perf:chunking  
npm run perf:snippets

# Comprehensive comparison
npm run perf:all
```

Each test should output:
- Average response time
- 95th percentile response time
- Memory usage
- Search relevance scores
- Error rates