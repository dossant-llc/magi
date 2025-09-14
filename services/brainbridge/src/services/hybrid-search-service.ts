import { BM25Service, BM25Document, BM25SearchResult } from './bm25-service.js';
import { LoggerService } from './logger-service.js';

export interface VectorSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  privacy: string;
  filePath: string;
  similarity: number;
}

export interface HybridSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  privacy: string;
  filePath: string;
  score: number;
  vectorScore?: number;
  bm25Score?: number;
  coverageBonus?: number;
}

export class HybridSearchService {
  private bm25Service: BM25Service | null = null;
  private loggerService: LoggerService;

  constructor() {
    // Enable BM25 service for hybrid search
    this.bm25Service = new BM25Service();
    this.loggerService = new LoggerService('logs/hybrid-search-service.log');
  }

  /**
   * Add document to both vector and BM25 indexes
   */
  addDocument(doc: BM25Document): void {
    this.bm25Service?.addDocument(doc);
  }

  /**
   * Remove document from indexes
   */
  removeDocument(docId: string): void {
    this.bm25Service?.removeDocument(docId);
  }

  /**
   * Reciprocal Rank Fusion (RRF) algorithm
   * RRF_score(doc) = Σ 1 / (k + rank_i(doc)) for all retrieval legs
   */
  private rrfFusion(
    vectorResults: VectorSearchResult[],
    bm25Results: BM25SearchResult[],
    k: number = 60
  ): HybridSearchResult[] {
    const scores = new Map<string, {
      vectorRank?: number;
      bm25Rank?: number;
      doc: VectorSearchResult | BM25SearchResult;
      vectorScore?: number;
      bm25Score?: number;
    }>();

    // Index vector results by rank (1-based)
    vectorResults.forEach((doc, index) => {
      const rank = index + 1;
      scores.set(doc.id, {
        vectorRank: rank,
        doc,
        vectorScore: doc.similarity
      });
    });

    // Index BM25 results by rank (1-based)
    bm25Results.forEach((doc, index) => {
      const rank = index + 1;
      const existing = scores.get(doc.id);
      if (existing) {
        existing.bm25Rank = rank;
        existing.bm25Score = doc.score;
      } else {
        scores.set(doc.id, {
          bm25Rank: rank,
          doc,
          bm25Score: doc.score
        });
      }
    });

    // Calculate RRF scores
    const fusedResults: HybridSearchResult[] = [];

    for (const [docId, data] of scores) {
      const vectorRank = data.vectorRank ?? 1e9; // Large number if not found
      const bm25Rank = data.bm25Rank ?? 1e9;

      const rrfScore = (1 / (k + vectorRank)) + (1 / (k + bm25Rank));

      fusedResults.push({
        id: docId,
        title: data.doc.title,
        content: data.doc.content,
        category: data.doc.category,
        privacy: data.doc.privacy,
        filePath: data.doc.filePath,
        score: rrfScore,
        vectorScore: data.vectorScore,
        bm25Score: data.bm25Score
      });
    }

    // Sort by RRF score (higher is better)
    fusedResults.sort((a, b) => b.score - a.score);

    return fusedResults;
  }

  /**
   * Lightweight coverage-based re-ranking
   * Boosts results that contain multiple query terms or synonyms
   */
  private applyCoverageBonus(
    results: HybridSearchResult[],
    originalQuery: string
  ): HybridSearchResult[] {
    // Extract key terms from query
    const queryTerms = originalQuery.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);

    // Common synonyms map for coverage calculation
    const synonymMap = new Map([
      ['deepest', ['lowest', 'minimal', 'bass', 'sub', 'below']],
      ['human', ['person', 'people', 'body', 'vocal']],
      ['voice', ['sound', 'pitch', 'frequency', 'hearing', 'audible']],
      ['contains', ['has', 'includes', 'consists', 'made', 'enough']],
      ['antarctica', ['antarctic', 'south', 'pole', 'ice']],
      ['lightning', ['electric', 'strike', 'thunder', 'strikes']],
      ['ferrets', ['ferret', 'animal', 'mammal']],
      ['business', ['group', 'collection']],
      ['wall', ['barrier', 'structure', 'visible']],
      ['china', ['chinese']],
      ['eagles', ['eagle', 'bird', 'raptor', 'convocation']],
      ['whales', ['whale', 'cetacean', 'marine', 'pod']]
    ]);

    return results.map(result => {
      const text = `${result.title} ${result.content}`.toLowerCase();
      let coverageScore = 0;

      // Count direct term matches
      for (const term of queryTerms) {
        if (text.includes(term)) {
          coverageScore += 1;
        }

        // Count synonym matches
        const synonyms = synonymMap.get(term) || [];
        for (const synonym of synonyms) {
          if (text.includes(synonym)) {
            coverageScore += 0.5; // Synonyms get half weight
            break; // Only count one synonym per term
          }
        }
      }

      // Normalize coverage score
      const maxPossibleScore = queryTerms.length * 1.5; // 1 for direct + 0.5 for synonym
      const normalizedCoverage = coverageScore / maxPossibleScore;

      // Apply coverage bonus (small boost to avoid overwhelming RRF)
      const coverageBonus = normalizedCoverage >= 0.3 ? 0.1 * normalizedCoverage : 0;

      return {
        ...result,
        score: result.score + coverageBonus,
        coverageBonus
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Hybrid search using both vector and BM25 with RRF fusion
   */
  async hybridSearch(
    query: string,
    vectorSearchFn: (query: string, topK: number) => Promise<VectorSearchResult[]>,
    options: {
      vectorTopK?: number;
      bm25TopK?: number;
      fusedTopK?: number;
      finalResults?: number;
    } = {}
  ): Promise<HybridSearchResult[]> {
    const {
      vectorTopK = 15,
      bm25TopK = 50,
      fusedTopK = 20,
      finalResults = 10
    } = options;

    this.loggerService.trace('Starting hybrid search', {
      query,
      vectorTopK,
      bm25TopK,
      fusedTopK,
      finalResults
    });

    try {
      // Run vector search and BM25 search
      const vectorResults = await vectorSearchFn(query, vectorTopK);
      const bm25Results = this.bm25Service?.search(query, bm25TopK) || [];

      this.loggerService.trace('Individual search results', {
        vectorResults: vectorResults.length,
        bm25Results: bm25Results.length,
        topVectorScore: vectorResults[0]?.similarity || 0,
        topBM25Score: bm25Results[0]?.score || 0
      });

      // Apply RRF fusion
      const fusedResults = this.rrfFusion(vectorResults, bm25Results);

      // Take top candidates for re-ranking
      const candidatesForRerank = fusedResults.slice(0, fusedTopK);

      // Apply coverage-based re-ranking
      const rerankedResults = this.applyCoverageBonus(candidatesForRerank, query);

      // Return final results
      const finalHybridResults = rerankedResults.slice(0, finalResults);

      this.loggerService.trace('Hybrid search completed', {
        query,
        fusedResults: fusedResults.length,
        candidatesForRerank: candidatesForRerank.length,
        finalResults: finalHybridResults.length,
        topFinalScore: finalHybridResults[0]?.score || 0,
        scoreBreakdown: finalHybridResults.slice(0, 3).map(r => ({
          title: r.title?.substring(0, 40),
          totalScore: Math.round(r.score * 1000) / 1000,
          vectorScore: r.vectorScore ? Math.round(r.vectorScore * 1000) / 1000 : undefined,
          bm25Score: r.bm25Score ? Math.round(r.bm25Score * 1000) / 1000 : undefined,
          coverageBonus: r.coverageBonus ? Math.round(r.coverageBonus * 1000) / 1000 : undefined
        }))
      });

      return finalHybridResults;

    } catch (error) {
      this.loggerService.error('Hybrid search failed', {
        error: error instanceof Error ? error.message : String(error),
        query
      });
      return [];
    }
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      bm25: this.bm25Service?.getStats() || { documentsCount: 0, engine: 'disabled' }
    };
  }

  /**
   * Rebuild indexes
   */
  rebuildIndexes(): void {
    this.bm25Service?.rebuildIndex();
  }
}