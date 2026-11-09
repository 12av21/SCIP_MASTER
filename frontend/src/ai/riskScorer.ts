// SCIP AI/ML Foundation - Explainable Priority & Risk Scoring Engine
// Calculates multidimensional risk scores [0-100] with explicit transparent factors.
// Shows WHY a priority/risk value was generated.

import { Report, IncidentPriority, RiskFactor, RiskScore } from '../types/scip';

interface RiskEvaluationInput {
  entityType: 'report' | 'incident' | 'cluster';
  entityId: string;
  reports: Report[];
  locationName: string;
  isRecurrentHotspot?: boolean;
}

export function computeExplainableRisk(input: RiskEvaluationInput): RiskScore {
  const { entityType, entityId, reports, locationName, isRecurrentHotspot } = input;
  const count = reports.length;

  const factors: RiskFactor[] = [];

  // Factor 1: Inherent Severity & Hazard (weight 30%)
  let severityScore = 20;
  const hasCritical = reports.some(r => r.urgency === 'critical');
  const hasHigh = reports.some(r => r.urgency === 'high');
  const hasMedium = reports.some(r => r.urgency === 'medium');

  if (hasCritical) {
    severityScore = 95;
  } else if (hasHigh) {
    severityScore = 75;
  } else if (hasMedium) {
    severityScore = 45;
  }

  // Category hazard multiplier
  const categories = reports.map(r => r.category);
  if (categories.includes('Power & Lighting') || categories.includes('Structural Safety')) {
    severityScore = Math.min(100, severityScore + 10);
  }

  factors.push({
    factor: 'Inherent Physical Hazard',
    weight: 0.30,
    score: severityScore,
    description: hasCritical
      ? 'Critical urgency keywords detected (electrocution risk / structural hazard / major flood)'
      : hasHigh
      ? 'High severity conditions reported impacting public safety'
      : 'Standard municipal observation without immediate structural danger'
  });

  // Factor 2: Report Density / Volume (weight 25%)
  let densityScore = 15;
  if (count >= 5) {
    densityScore = 95;
  } else if (count >= 3) {
    densityScore = 75;
  } else if (count >= 2) {
    densityScore = 50;
  }

  factors.push({
    factor: 'Community Report Density',
    weight: 0.25,
    score: densityScore,
    description: `${count} independent citizen report(s) clustered in immediate perimeter`
  });

  // Factor 3: Infrastructure / Public Impact (weight 20%)
  const lowerLoc = locationName.toLowerCase();
  const allText = reports.map(r => `${r.title} ${r.description}`).join(' ').toLowerCase();

  let impactScore = 30;
  let impactReason = 'Standard local residential street or public space';

  if (
    lowerLoc.includes('hospital') ||
    lowerLoc.includes('school') ||
    lowerLoc.includes('station') ||
    lowerLoc.includes('metro') ||
    allText.includes('ambulance') ||
    allText.includes('hospital')
  ) {
    impactScore = 95;
    impactReason = 'Directly affects emergency access corridor, transit station, or medical institution';
  } else if (
    lowerLoc.includes('market') ||
    lowerLoc.includes('boulevard') ||
    lowerLoc.includes('junction') ||
    lowerLoc.includes('plaza') ||
    allText.includes('traffic jam') ||
    allText.includes('flooded road')
  ) {
    impactScore = 75;
    impactReason = 'Located on primary commercial artery or heavy transit intersection';
  }

  factors.push({
    factor: 'Public Infrastructure Impact',
    weight: 0.20,
    score: impactScore,
    description: impactReason
  });

  // Factor 4: Temporal Escalation Rate (weight 15%)
  let velocityScore = 20;
  let velocityDesc = 'Steady or single occurrence timeframe';

  if (reports.length >= 2) {
    const dates = reports.map(r => new Date(r.createdAt).getTime());
    const spanHours = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60);

    if (spanHours <= 3) {
      velocityScore = 90;
      velocityDesc = `Rapid surge: ${reports.length} incoming reports submitted within ${spanHours.toFixed(1)} hours`;
    } else if (spanHours <= 12) {
      velocityScore = 65;
      velocityDesc = `Escalating reports within past 12 hours`;
    }
  }

  factors.push({
    factor: 'Temporal Escalation Velocity',
    weight: 0.15,
    score: velocityScore,
    description: velocityDesc
  });

  // Factor 5: Historical Recurrence (weight 10%)
  const recurrenceScore = isRecurrentHotspot ? 85 : 20;
  factors.push({
    factor: 'Historical Area Recurrence',
    weight: 0.10,
    score: recurrenceScore,
    description: isRecurrentHotspot
      ? 'Area identified as recurring municipal issue hotspot (Sector 4 / Low-lying zone)'
      : 'First documented incident occurrence in recent monitoring window'
  });

  // Compute final weighted composite risk score [0 - 100]
  let compositeScore = 0;
  for (const f of factors) {
    compositeScore += f.score * f.weight;
  }

  const finalScore = Math.min(100, Math.max(10, Math.round(compositeScore)));

  // Derive Priority
  let priority: IncidentPriority = 'P4_LOW';
  if (finalScore >= 80) {
    priority = 'P1_CRITICAL';
  } else if (finalScore >= 60) {
    priority = 'P2_HIGH';
  } else if (finalScore >= 40) {
    priority = 'P3_MEDIUM';
  }

  const topFactor = [...factors].sort((a, b) => b.score - a.score)[0];
  const explanation = `Priority level ${priority} derived from composite risk score ${finalScore}/100. Primary driver: ${topFactor.factor} (${topFactor.score}/100) — ${topFactor.description}.`;

  return {
    id: `RISK-${entityId}`,
    entityType,
    entityId,
    score: finalScore,
    priority,
    factors,
    explanation,
    computedAt: new Date().toISOString()
  };
}
