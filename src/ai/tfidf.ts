// SCIP AI/ML Foundation - TF-IDF Vectorizer & Cosine Similarity Engine
// Implements mathematical TF-IDF feature extraction and cosine vector similarity

import { extractBagOfTerms } from './preprocessor';

export interface DocumentVector {
  id: string;
  vector: Map<string, number>;
  magnitude: number;
}
export const DocumentVector = {} as any;

export class TFIDFVectorizer {
  private vocabulary: Map<string, number> = new Map(); // term -> document frequency (DF)
  private totalDocuments: number = 0;
  private idfCache: Map<string, number> = new Map(); // term -> IDF

  /**
   * Fit the vectorizer on a corpus of text documents.
   */
  public fit(documents: { id: string; text: string }[]): void {
    this.vocabulary.clear();
    this.idfCache.clear();
    this.totalDocuments = documents.length;

    for (const doc of documents) {
      const terms = new Set(extractBagOfTerms(doc.text));
      for (const term of terms) {
        this.vocabulary.set(term, (this.vocabulary.get(term) || 0) + 1);
      }
    }

    // Compute smooth IDF: log((N + 1) / (DF + 1)) + 1
    for (const [term, df] of this.vocabulary.entries()) {
      const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1;
      this.idfCache.set(term, idf);
    }
  }

  /**
   * Transform a single text string into a normalized TF-IDF feature vector.
   */
  public transform(text: string, id: string = ''): DocumentVector {
    const terms = extractBagOfTerms(text);
    const termCounts: Map<string, number> = new Map();

    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }

    const vector = new Map<string, number>();
    let sumOfSquares = 0;

    for (const [term, count] of termCounts.entries()) {
      // Sublinear TF scaling: 1 + log(count)
      const tf = 1 + Math.log(count);
      // Default IDF for out-of-vocabulary terms
      const idf = this.idfCache.get(term) || (Math.log(this.totalDocuments + 2) + 1);
      const tfidf = tf * idf;
      vector.set(term, tfidf);
      sumOfSquares += tfidf * tfidf;
    }

    const magnitude = Math.sqrt(sumOfSquares);

    // L2 normalize the vector
    if (magnitude > 0) {
      for (const [term, val] of vector.entries()) {
        vector.set(term, val / magnitude);
      }
    }

    return {
      id,
      vector,
      magnitude: magnitude > 0 ? 1 : 0
    };
  }

  /**
   * Compute Cosine Similarity between two TF-IDF vectors.
   * Cosine = (A · B) / (||A|| * ||B||). Since vectors are L2-normalized, Cosine = A · B.
   */
  public cosineSimilarity(vecA: DocumentVector, vecB: DocumentVector): number {
    if (vecA.magnitude === 0 || vecB.magnitude === 0) return 0;

    let dotProduct = 0;
    // Iterate over the smaller vector for computational efficiency
    const [smaller, larger] = vecA.vector.size < vecB.vector.size
      ? [vecA.vector, vecB.vector]
      : [vecB.vector, vecA.vector];

    for (const [term, valA] of smaller.entries()) {
      const valB = larger.get(term);
      if (valB !== undefined) {
        dotProduct += valA * valB;
      }
    }

    // Clamp between 0 and 1
    return Math.min(1, Math.max(0, dotProduct));
  }

  /**
   * Extract the top most significant matching terms between two vectors.
   */
  public getMatchingTerms(vecA: DocumentVector, vecB: DocumentVector, topK: number = 5): string[] {
    const matches: { term: string; score: number }[] = [];

    for (const [term, valA] of vecA.vector.entries()) {
      const valB = vecB.vector.get(term);
      if (valB !== undefined) {
        matches.push({ term, score: valA * valB });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, topK).map(m => m.term.replace('_', ' '));
  }

  /**
   * Get the top N most characteristic keywords for a vector.
   */
  public getTopKeywords(vec: DocumentVector, topK: number = 6): string[] {
    const entries = Array.from(vec.vector.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, topK).map(e => e[0].replace('_', ' '));
  }
}

// Global shared vectorizer instance
export const globalVectorizer = new TFIDFVectorizer();
