// SCIP AI/ML Foundation - Classification & Entity Extraction Engine
// Supervised centroid-based TF-IDF classifier and domain entity extractor

import { ReportCategory, UrgencyLevel } from '../types/scip';
import { globalVectorizer, DocumentVector } from './tfidf';

interface CategoryProfile {
  category: ReportCategory;
  representativeTerms: string[];
  weight: number;
}

const CATEGORY_PROFILES: CategoryProfile[] = [
  {
    category: 'Water & Drainage',
    representativeTerms: [
      'water', 'drain', 'drainage', 'sewer', 'sewage', 'flooding', 'flood',
      'overflow', 'pipe', 'leakage', 'leak', 'clogged', 'blocked', 'gutter',
      'culvert', 'stormwater', 'manhole', 'stagnant', 'puddle', 'contamination'
    ],
    weight: 1.2
  },
  {
    category: 'Roads & Traffic',
    representativeTerms: [
      'road', 'traffic', 'pothole', 'signal', 'light', 'jam', 'congestion',
      'asphalt', 'divider', 'sidewalk', 'speed', 'breaker', 'vehicle', 'accident',
      'pedestrian', 'crossing', 'lane', 'intersection', 'surface', 'crater'
    ],
    weight: 1.0
  },
  {
    category: 'Public Sanitation',
    representativeTerms: [
      'garbage', 'waste', 'trash', 'dump', 'dumping', 'bin', 'litter',
      'smell', 'odor', 'stench', 'debris', 'carcass', 'sanitary', 'cleanliness',
      'sweeping', 'overflowing', 'rotting', 'plastic', 'refuse'
    ],
    weight: 1.0
  },
  {
    category: 'Power & Lighting',
    representativeTerms: [
      'power', 'electricity', 'wire', 'cable', 'transformer', 'pole', 'blackout',
      'outage', 'streetlight', 'lamp', 'dark', 'sparking', 'hanging', 'voltage',
      'meter', 'grid', 'current', 'shock'
    ],
    weight: 1.1
  },
  {
    category: 'Parks & Environment',
    representativeTerms: [
      'tree', 'branch', 'fallen', 'park', 'grass', 'bench', 'playground',
      'garden', 'pruning', 'overgrown', 'foliage', 'greenery', 'plant', 'lake',
      'pond', 'birds', 'wildlife'
    ],
    weight: 0.9
  },
  {
    category: 'Structural Safety',
    representativeTerms: [
      'building', 'wall', 'crack', 'collapse', 'ceiling', 'bridge', 'railing',
      'scaffolding', 'pillar', 'structure', 'hazardous', 'dilapidated', 'unstable',
      'brick', 'concrete', 'foundation'
    ],
    weight: 1.2
  },
  {
    category: 'Public Health',
    representativeTerms: [
      'mosquito', 'breeding', 'disease', 'dengue', 'malaria', 'rodent', 'rat',
      'infestation', 'stray', 'dog', 'bite', 'dead', 'animal', 'hygiene',
      'hazardous', 'medical', 'waste'
    ],
    weight: 1.1
  },
  {
    category: 'Noise & Disturbance',
    representativeTerms: [
      'noise', 'loudspeaker', 'music', 'sound', 'decibel', 'construction',
      'night', 'disturbance', 'generator', 'honking', 'nuisance', 'industrial'
    ],
    weight: 0.8
  }
];

const KNOWN_INFRASTRUCTURE = [
  'drain', 'drainage', 'storm drain', 'sewer', 'manhole', 'culvert', 'pipe',
  'water pipe', 'traffic light', 'traffic signal', 'road', 'highway', 'street',
  'sidewalk', 'pavement', 'footpath', 'speed bump', 'transformer', 'electric pole',
  'streetlight', 'power line', 'wire', 'cable', 'transformer box', 'garbage bin',
  'waste container', 'bridge', 'overpass', 'flyover', 'building wall', 'compound wall',
  'railing', 'water tanker', 'pipeline', 'substation'
];

const KNOWN_LOCATIONS = [
  'sector 4 market', 'sector 4', 'sector 7', 'sector 12', 'west boulevard',
  'north industrial park', 'river road', 'riverfront', 'central plaza', 'railway road',
  'station square', 'green park avenue', 'hospital road', 'metro station',
  'commercial hub', 'old city gate', 'ring road junction', 'school road',
  'civic center', 'sub-city sector 9'
];

const HAZARD_TERMS = [
  'flooding', 'deep water', 'stalled vehicle', 'open manhole', 'live wire',
  'electric shock hazard', 'sparking wire', 'gas smell', 'building collapse',
  'deep pothole', 'severe accident risk', 'falling tree', 'structural crack',
  'uncontrolled sewage', 'chemical smell', 'toxic waste', 'blocked emergency route'
];

const TEMPORAL_PATTERNS = [
  'today', 'yesterday', 'this morning', 'last night', 'since morning',
  'past 2 hours', 'past 3 days', 'continuous', 'every monsoon', 'heavy rain',
  'peak hours', 'night time'
];

/**
 * Supervised Classification: Scores text against Category TF-IDF profiles.
 */
export function classifyReport(
  text: string,
  declaredCategory?: ReportCategory
): {
  predictedCategory: ReportCategory;
  confidence: number;
  allScores: { category: ReportCategory; score: number }[];
} {
  const docVec = globalVectorizer.transform(text);

  const scores: { category: ReportCategory; score: number }[] = [];

  for (const profile of CATEGORY_PROFILES) {
    const profileText = profile.representativeTerms.join(' ');
    const profileVec = globalVectorizer.transform(profileText);
    const rawSim = globalVectorizer.cosineSimilarity(docVec, profileVec);
    const weightedScore = rawSim * profile.weight;
    scores.push({ category: profile.category, score: weightedScore });
  }

  scores.sort((a, b) => b.score - a.score);

  // If citizen manually selected category and it has reasonable score, factor it in
  let top = scores[0];
  let confidence = Math.min(0.96, Math.max(0.55, top.score * 1.5));

  if (declaredCategory) {
    const declaredMatch = scores.find(s => s.category === declaredCategory);
    if (declaredMatch && declaredMatch.score > 0.15) {
      top = declaredMatch;
      confidence = Math.min(0.95, confidence + 0.1);
    }
  }

  return {
    predictedCategory: top.category,
    confidence: Number(confidence.toFixed(2)),
    allScores: scores.map(s => ({ category: s.category, score: Number(s.score.toFixed(3)) }))
  };
}

/**
 * Entity Extraction: Extracts municipal domain entities from text.
 */
export function extractEntities(text: string): {
  locations: string[];
  infrastructure: string[];
  hazards: string[];
  temporal: string[];
} {
  const lower = text.toLowerCase();

  const locations: string[] = [];
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc)) {
      locations.push(loc.replace(/\b\w/g, c => c.toUpperCase()));
    }
  }

  const infrastructure: string[] = [];
  for (const inf of KNOWN_INFRASTRUCTURE) {
    if (lower.includes(inf)) {
      infrastructure.push(inf);
    }
  }

  const hazards: string[] = [];
  for (const haz of HAZARD_TERMS) {
    if (lower.includes(haz)) {
      hazards.push(haz);
    }
  }

  const temporal: string[] = [];
  for (const temp of TEMPORAL_PATTERNS) {
    if (lower.includes(temp)) {
      temporal.push(temp);
    }
  }

  return {
    locations: Array.from(new Set(locations)),
    infrastructure: Array.from(new Set(infrastructure)),
    hazards: Array.from(new Set(hazards)),
    temporal: Array.from(new Set(temporal))
  };
}

/**
 * Urgency/Severity Indicator based on hazard keywords and language intensity.
 */
export function determineSeverity(text: string, urgencyDeclared?: UrgencyLevel): UrgencyLevel {
  const lower = text.toLowerCase();

  const criticalKeywords = ['live wire', 'collapse', 'sparking', 'gas leak', 'major flood', 'electrocution', 'severe injury', 'blocked ambulance'];
  const highKeywords = ['flooded road', 'submerged', 'stalled vehicle', 'open manhole', 'burst pipe', 'overflowing sewage', 'heavy congestion', 'fallen tree blocking'];
  const mediumKeywords = ['pothole', 'broken light', 'garbage piled', 'water logging', 'slow traffic', 'foul smell'];

  for (const kw of criticalKeywords) {
    if (lower.includes(kw)) return 'critical';
  }
  for (const kw of highKeywords) {
    if (lower.includes(kw)) return 'high';
  }
  if (urgencyDeclared === 'critical') return 'critical';
  if (urgencyDeclared === 'high') return 'high';

  for (const kw of mediumKeywords) {
    if (lower.includes(kw)) return 'medium';
  }

  return urgencyDeclared || 'low';
}
