export interface MemoryEntry {
  title: string;
  content: string;
  category: string;
  timestamp?: string;
}

export interface SearchResult {
  file: string;
  matches: string[];
}

export interface OrganizationPattern {
  category: string;
  examples: string[];
  frequency: number;
}

export interface CategoryStats {
  count: number;
  examples: string[];
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}