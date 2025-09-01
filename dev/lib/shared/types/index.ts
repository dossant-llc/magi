export type PrivacyLevel = 'public' | 'team' | 'personal' | 'private' | 'sensitive';

export interface KnowledgeFile {
  path: string;
  privacyLevel: PrivacyLevel;
  tags: string[];
  created: string;
  updated: string;
  title: string;
}

export interface ConsentRequest {
  id: string;
  timestamp: Date;
  requester: {
    name: string;           // "ChatGPT", "Claude Web", "Custom Bot"
    type: 'local' | 'cloud' | 'api';
    trustLevel?: number;    // 0-100 based on past behavior
  };
  query: {
    intent: string;         // "debug network issues"
    searchTerms: string[];  // ["network", "printer", "connectivity"]  
    files: string[];        // ["network-issues.md", "printer-setup.md"]
    privacyLevels: PrivacyLevel[]; // what levels needed
  };
  purpose: string;          // Human readable explanation
  duration?: 'once' | 'session' | 'permanent';
  redactionOptions?: string[]; // ["ip-addresses", "names", "passwords"]
}

export interface ConsentResponse {
  requestId: string;
  decision: 'allow' | 'deny' | 'allow_with_redaction';
  duration?: 'once' | 'session' | 'permanent';
  redactionRules?: string[];
  reasoning?: string;       // User's explanation
}

export interface PrivacySuggestion {
  suggestedLevel: PrivacyLevel;
  confidence: number;       // 0-100
  reasoning: string;
  alternatives: Array<{
    level: PrivacyLevel;
    confidence: number;
    reasoning: string;
  }>;
}

export interface UserPreferences {
  defaultConfidenceThreshold: number; // Ask for confirmation below this
  privacyStyle: 'conservative' | 'balanced' | 'open';
  autoPromoteToSensitive: string[];   // Keywords that trigger sensitive
  neverAutoPublic: string[];          // Keywords that prevent public
  personalKeywords: Record<string, PrivacyLevel>;
}

export interface AccessLog {
  timestamp: Date;
  requester: string;
  filesAccessed: string[];
  query: string;
  consentId: string;
  success: boolean;
  redactionsApplied?: string[];
}