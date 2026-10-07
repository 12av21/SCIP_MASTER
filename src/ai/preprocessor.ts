// SCIP AI/ML Foundation - Text Preprocessing Module
// Implements tokenization, lowercasing, domain-specific stopword removal, Porter-style stemming, and n-grams

const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is',
  'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
  'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they',
  'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  'please', 'help', 'sir', 'madam', 'complaint', 'dear', 'thanks', 'urgent'
]);

/**
 * Clean raw text: lowercases, removes special characters while preserving alphanumeric tokens.
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize string into array of word tokens.
 */
export function tokenize(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  return cleaned.split(/\s+/).filter(token => token.length > 1);
}

/**
 * Lightweight rule-based suffix stemmer (reduces plurals, -ing, -ed, -tion, -ment, etc.).
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;

  let w = word.toLowerCase();

  // Step 1: Plurals and past tense
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('ss')) w = w;
  else if (w.endsWith('s') && !w.endsWith('us') && !w.endsWith('is')) w = w.slice(0, -1);

  if (w.endsWith('eed')) {
    if (w.length > 4) w = w.slice(0, -1);
  } else if (w.endsWith('ed')) {
    if (w.length > 4) w = w.slice(0, -2);
  } else if (w.endsWith('ing')) {
    if (w.length > 5) w = w.slice(0, -3);
  }

  // Step 2: Nominalization suffixes
  if (w.endsWith('ation')) w = w.slice(0, -5) + 'ate';
  else if (w.endsWith('tion')) w = w.slice(0, -4) + 't';
  else if (w.endsWith('ment')) w = w.slice(0, -4);
  else if (w.endsWith('ance') || w.endsWith('ence')) w = w.slice(0, -4);
  else if (w.endsWith('able') || w.endsWith('ible')) w = w.slice(0, -4);

  return w;
}

/**
 * Full preprocessing pipeline: Tokenize, remove stopwords, and apply stemming.
 */
export function preprocessText(text: string): string[] {
  const tokens = tokenize(text);
  const filtered = tokens.filter(t => !ENGLISH_STOPWORDS.has(t));
  return filtered.map(t => stem(t));
}

/**
 * Generate n-grams from a token sequence.
 */
export function generateNGrams(tokens: string[], n: number = 2): string[] {
  if (tokens.length < n) return [];
  const nGrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    nGrams.push(tokens.slice(i, i + n).join('_'));
  }
  return nGrams;
}

/**
 * Extract unigrams and bigrams for enhanced feature representation.
 */
export function extractBagOfTerms(text: string): string[] {
  const processedTokens = preprocessText(text);
  const bigrams = generateNGrams(processedTokens, 2);
  return [...processedTokens, ...bigrams];
}
