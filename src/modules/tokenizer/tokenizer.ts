// Text tokenization for search processing
// Breaks text into tokens with character offsets for precise matching

import { Token } from '../../types/viewport';

/**
 * Tokenize text into words and whitespace tokens with character positions
 * This preserves the exact character mapping needed for substring measurement
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let currentIndex = 0;
  
  // Regular expression to match words (letters, numbers, some punctuation) and whitespace
  const tokenRegex = /(\S+|\s+)/g;
  let match;
  
  while ((match = tokenRegex.exec(text)) !== null) {
    const tokenText = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + tokenText.length;
    
    tokens.push({
      text: tokenText,
      startIndex,
      endIndex
    });
    
    currentIndex = endIndex;
  }
  
  return tokens;
}

/**
 * Find the token that contains a given character index
 * Used for mapping character positions back to tokens
 */
export function findTokenAtIndex(tokens: Token[], charIndex: number): Token | null {
  for (const token of tokens) {
    if (charIndex >= token.startIndex && charIndex < token.endIndex) {
      return token;
    }
  }
  return null;
}

/**
 * Get the text content from a range of tokens
 * Used for reconstructing matched text spans
 */
export function getTokenRangeText(tokens: Token[], startTokenIndex: number, endTokenIndex: number): string {
  if (startTokenIndex < 0 || endTokenIndex >= tokens.length || startTokenIndex > endTokenIndex) {
    return '';
  }
  
  const startChar = tokens[startTokenIndex].startIndex;
  const endChar = tokens[endTokenIndex].endIndex;
  
  // Reconstruct from the first token's original text
  const firstToken = tokens[0];
  const originalText = tokens.map(t => t.text).join('');
  
  return originalText.substring(startChar, endChar);
}

/**
 * Normalize text for consistent searching
 * Handles Unicode normalization and case folding
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')  // Unicode normalization
    .toLowerCase()      // Case insensitive
    .trim();           // Remove leading/trailing whitespace
}
