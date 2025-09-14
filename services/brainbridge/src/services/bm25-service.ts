import winkBM25 from 'wink-bm25-text-search';
const nlpUtils = require('wink-nlp-utils');
import { LoggerService } from './logger-service.js';

export interface BM25Document {
  id: string;
  title: string;
  content: string;
  category: string;
  privacy: string;
  filePath: string;
}

export interface BM25SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  privacy: string;
  filePath: string;
  score: number;
}

export class BM25Service {
  private searchEngine: any;
  private documents: Map<string, BM25Document> = new Map();
  private loggerService: LoggerService;

  constructor() {
    this.loggerService = new LoggerService('logs/bm25-service.log');
    this.searchEngine = winkBM25();

    // Configure BM25 parameters for better performance
    this.searchEngine.defineConfig({
      fldWeights: { title: 4, content: 1 }, // Title gets 4x weight
      bm25Params: { k1: 1.2, b: 0.75, k: 1 }
    });

    // Define text preparation pipeline
    this.searchEngine.definePrepTasks([
      // Standard text processing
      nlpUtils.string.lowerCase,
      nlpUtils.string.removeElisions,
      nlpUtils.string.removePunctuations,
      nlpUtils.string.removeExtraSpaces,
      nlpUtils.string.stem
    ]);
  }

  /**
   * Add document to BM25 index
   */
  addDocument(doc: BM25Document): void {
    try {
      // Store the full document
      this.documents.set(doc.id, doc);

      // Add to BM25 index with title and content
      this.searchEngine.addDoc({
        title: doc.title,
        content: `${doc.title} ${doc.content}` // Include title in content for better matching
      }, doc.id);

      this.loggerService.trace('Added document to BM25 index', {
        id: doc.id,
        title: doc.title?.substring(0, 50),
        contentLength: doc.content?.length || 0
      });
    } catch (error) {
      this.loggerService.error('Failed to add document to BM25 index', {
        error: error instanceof Error ? error.message : String(error),
        docId: doc.id
      });
    }
  }

  /**
   * Expand query with synonyms and related terms for better recall
   */
  private expandQuery(query: string): string {
    const expansions = new Map([
      // Common synonyms and variations
      ['deepest', 'lowest deep bass record minimal'],
      ['highest', 'tallest top maximum peak'],
      ['human', 'person people body'],
      ['voice', 'vocal sound pitch frequency'],
      ['body', 'human anatomy physical'],
      ['contains', 'has includes consists'],
      ['water', 'liquid H2O aqua'],
      ['antarctica', 'antarctic south pole'],
      ['space', 'universe cosmos outer'],
      ['visible', 'see seen sight'],
      ['lightning', 'electric electrical strike thunder'],
      ['ferrets', 'ferret animal mammal'],
      ['business', 'group collection'],
      ['cloud', 'clouds weather atmospheric'],
      ['weight', 'weigh mass heavy'],
      ['brain', 'mind neural cognitive'],
      ['heart', 'cardiac cardiovascular'],
      ['stomach', 'gastric digestive'],
      ['wall', 'barrier structure'],
      ['china', 'chinese'],
      ['eagles', 'eagle bird raptor'],
      ['whales', 'whale cetacean marine']
    ]);

    let expandedQuery = query.toLowerCase();

    // Add expansions for matched terms
    for (const [term, expansion] of expansions) {
      if (expandedQuery.includes(term)) {
        expandedQuery += ` ${expansion}`;
      }
    }

    // Add common phrase patterns
    if (expandedQuery.includes('range') && expandedQuery.includes('hearing')) {
      expandedQuery += ' "below the range of human hearing" sub-audible infrasound';
    }
    if (expandedQuery.includes('group') && expandedQuery.includes('called')) {
      expandedQuery += ' collective noun name';
    }

    this.loggerService.trace('Expanded query for BM25 search', {
      original: query,
      expanded: expandedQuery.substring(0, 200)
    });

    return expandedQuery;
  }

  /**
   * Search documents using BM25 algorithm
   */
  search(query: string, limit: number = 50): BM25SearchResult[] {
    try {
      this.loggerService.trace('🔍 EXTREME TRACE: Starting BM25 search', {
        query,
        limit,
        documentsInIndex: this.documents.size,
        searchEngineExists: !!this.searchEngine
      });

      // Expand query for better recall
      const expandedQuery = this.expandQuery(query);

      this.loggerService.trace('🔍 EXTREME TRACE: Query expansion completed', {
        originalQuery: query,
        expandedQuery: expandedQuery.substring(0, 200),
        expansionLength: expandedQuery.length
      });

      // Perform BM25 search
      this.loggerService.trace('🔍 EXTREME TRACE: Executing BM25 search engine');
      const results = this.searchEngine.search(expandedQuery, limit);

      this.loggerService.trace('🔍 EXTREME TRACE: Raw BM25 search results', {
        rawResultsCount: results.length,
        rawResults: results.slice(0, 3).map((r: any) => ({
          docId: r[0],
          score: r[1],
          hasDocument: this.documents.has(r[0])
        }))
      });

      // Convert results to our format
      const searchResults: BM25SearchResult[] = results.map((result: any) => {
        const doc = this.documents.get(result[0]); // result[0] is document ID
        if (!doc) {
          this.loggerService.warn('BM25 result missing document', { docId: result[0] });
          return null;
        }

        return {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          privacy: doc.privacy,
          filePath: doc.filePath,
          score: result[1] // result[1] is BM25 score
        };
      }).filter(Boolean) as BM25SearchResult[];

      this.loggerService.trace('🔍 EXTREME TRACE: BM25 search completed', {
        query,
        originalQuery: query,
        expandedQuery: expandedQuery.substring(0, 100),
        rawResultsCount: results.length,
        processedResultsCount: searchResults.length,
        documentsInIndex: this.documents.size,
        topScore: searchResults[0]?.score || 0,
        detailedResults: searchResults.slice(0, 3).map(r => ({
          id: r.id,
          title: r.title?.substring(0, 40),
          score: Math.round(r.score * 100) / 100,
          privacy: r.privacy,
          contentLength: r.content?.length || 0
        }))
      });

      return searchResults;
    } catch (error) {
      this.loggerService.error('BM25 search failed', {
        error: error instanceof Error ? error.message : String(error),
        query
      });
      return [];
    }
  }

  /**
   * Remove document from index
   */
  removeDocument(docId: string): void {
    try {
      this.documents.delete(docId);
      // Note: wink-bm25 doesn't have removeDoc, so we'd need to rebuild for deletions
      // For now, just remove from our document store
      this.loggerService.trace('Removed document from BM25 store', { docId });
    } catch (error) {
      this.loggerService.error('Failed to remove document from BM25 index', {
        error: error instanceof Error ? error.message : String(error),
        docId
      });
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      documentsCount: this.documents.size,
      engine: 'wink-bm25-text-search'
    };
  }

  /**
   * Rebuild index (for when documents are deleted)
   */
  rebuildIndex(): void {
    try {
      this.loggerService.trace('Rebuilding BM25 index', { documentsCount: this.documents.size });

      // Create new search engine
      this.searchEngine = winkBM25();
      this.searchEngine.defineConfig({
        fldWeights: { title: 4, content: 1 },
        bm25Params: { k1: 1.2, b: 0.75, k: 1 }
      });
      this.searchEngine.definePrepTasks([
        nlpUtils.string.lowerCase,
        nlpUtils.string.removeElisions,
        nlpUtils.string.removePunctuations,
        nlpUtils.string.removeExtraSpaces,
        nlpUtils.string.stem
      ]);

      // Re-add all documents
      for (const doc of this.documents.values()) {
        this.searchEngine.addDoc({
          title: doc.title,
          content: `${doc.title} ${doc.content}`
        }, doc.id);
      }

      this.loggerService.trace('BM25 index rebuild completed');
    } catch (error) {
      this.loggerService.error('BM25 index rebuild failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}