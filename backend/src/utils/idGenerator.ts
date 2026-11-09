// ID Generator Utility - Generates prefixed unique IDs

const counters: Record<string, number> = {};

export function generateId(prefix: string): string {
  const now = Date.now();
  const counter = (counters[prefix] || 0) + 1;
  counters[prefix] = counter;
  return `${prefix}-${now.toString(36).toUpperCase()}-${counter.toString(36).toUpperCase().padStart(4, '0')}`;
}

export function generateObjectId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).substr(2)}`;
}