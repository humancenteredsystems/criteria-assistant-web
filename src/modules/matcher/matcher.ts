// Text matching for search queries
// Finds query matches in tokenized text and returns character spans

import { Token, MatchSpan } from '../../types/viewport';
import { normalizeText } from '../tokenizer/tokenizer';

/**
 * Find all matches of a query in the given tokens
 * Returns character-based spans for precise substring measurement
 */
export function findMatches(tokens: Token[], query: string): MatchSpan[] {
  if (!query.trim() || tokens.length === 0) {
    return [];
  }

  const matches: MatchSpan[] = [];
  const normalizedQuery = normalizeText(query);
  const termId = generateTermId(query);
  
  // Reconstruct the full text from tokens for searching
  const fullText = tokens.map(t => t.text).join('');
  const normalizedFullText = normalizeText(fullText);
  
  // Find all occurrences of the query
  let searchIndex = 0;
  while (searchIndex < normalizedFullText.length) {
    const matchIndex = normalizedFullText.indexOf(normalizedQuery, searchIndex);
    if (matchIndex === -1) break;
    
    // Map back to original text coordinates
    const startIndex = findOriginalIndex(fullText, normalizedFullText, matchIndex);
    const endIndex = findOriginalIndex(fullText, normalizedFullText, matchIndex + normalizedQuery.length);
    
    if (startIndex !== -1 && endIndex !== -1) {
      matches.push({
        startIndex,
        endIndex,
        termId
      });
    }
    
    searchIndex = matchIndex + 1; // Continue searching after this match
  }
  
  return matches;
}

/**
 * Find matches that span across word boundaries
 * Useful for partial word matching and phrase searches
 */
export function findPartialMatches(tokens: Token[], query: string): MatchSpan[] {
  if (!query.trim() || tokens.length === 0) {
    return [];
  }

  const matches: MatchSpan[] = [];
  const normalizedQuery = normalizeText(query);
  const termId = generateTermId(query);
  
  // Search within individual tokens for partial matches
  for (const token of tokens) {
    if (token.text.trim() === '') continue; // Skip whitespace tokens
    
    const normalizedToken = normalizeText(token.text);
    let tokenSearchIndex = 0;
    
    while (tokenSearchIndex < normalizedToken.length) {
      const matchIndex = normalizedToken.indexOf(normalizedQuery, tokenSearchIndex);
      if (matchIndex === -1) break;
      
      // Calculate absolute character positions
      const startIndex = token.startIndex + matchIndex;
      const endIndex = token.startIndex + matchIndex + normalizedQuery.length;
      
      matches.push({
        startIndex,
        endIndex,
        termId
      });
      
      tokenSearchIndex = matchIndex + 1;
    }
  }
  
  return matches;
}

/**
 * Find whole word matches only
 * More restrictive matching that respects word boundaries
 */
export function findWholeWordMatches(tokens: Token[], query: string): MatchSpan[] {
  if (!query.trim() || tokens.length === 0) {
    return [];
  }

  const matches: MatchSpan[] = [];
  const normalizedQuery = normalizeText(query);
  const termId = generateTermId(query);
  
  for (const token of tokens) {
    if (token.text.trim() === '') continue; // Skip whitespace tokens
    
    const normalizedToken = normalizeText(token.text);
    
    // Exact match for whole words
    if (normalizedToken === normalizedQuery) {
      matches.push({
        startIndex: token.startIndex,
        endIndex: token.endIndex,
        termId
      });
    }
  }
  
  return matches;
}

/**
 * Generate a unique term ID for a query
 * Used for grouping and styling matches
 */
function generateTermId(query: string): string {
  // Simple hash function for term ID
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `term_${Math.abs(hash)}`;
}

/**
 * Map normalized text index back to original text index
 * Handles the case where normalization changes character positions
 */
function findOriginalIndex(originalText: string, normalizedText: string, normalizedIndex: number): number {
  // For simple case where normalization only changes case
  if (originalText.length === normalizedText.length) {
    return normalizedIndex;
  }
  
  // More complex mapping needed for Unicode normalization
  // This is a simplified implementation - could be enhanced for complex cases
  let originalIndex = 0;
  let normalizedCount = 0;
  
  while (originalIndex < originalText.length && normalizedCount < normalizedIndex) {
    const originalChar = originalText[originalIndex];
    const normalizedChar = originalChar.normalize('NFKC').toLowerCase();
    
    normalizedCount += normalizedChar.length;
    originalIndex++;
  }
  
  return originalIndex;
}

/**
 * Merge overlapping or adjacent matches
 * Useful for cleaning up match results
 */
export function mergeMatches(matches: MatchSpan[]): MatchSpan[] {
  if (matches.length <= 1) return matches;
  
  // Sort matches by start index
  const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);
  const merged: MatchSpan[] = [];
  let current = sortedMatches[0];
  
  for (let i = 1; i < sortedMatches.length; i++) {
    const next = sortedMatches[i];
    
    // Check if matches overlap or are adjacent
    if (next.startIndex <= current.endIndex) {
      // Merge matches
      current = {
        startIndex: current.startIndex,
        endIndex: Math.max(current.endIndex, next.endIndex),
        termId: current.termId // Keep the first term ID
      };
    } else {
      // No overlap, add current and move to next
      merged.push(current);
      current = next;
    }
  }
  
  merged.push(current);
  return merged;
}
