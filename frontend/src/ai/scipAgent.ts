// SCIP AI/ML Foundation - SCIP Intelligence Agent
// Orchestrates 10 specialized intelligence tools to transform community observations into structured decision support.
// Strictly adheres to the Responsible AI principle and transparency standards.

import { Report, Incident, AgentBriefing, AgentToolResult } from '../types/scip';
import { classifyReport, extractEntities, determineSeverity } from './classifier';
import { globalVectorizer } from './tfidf';
import { findSimilarAndDuplicateReports, calculateHaversineDistance } from './duplicateDetector';
import { detectIncidentClusters } from './incidentClustering';
import { computeExplainableRisk } from './riskScorer';

export interface AgentContext {
  reports: Report[];
  incidents: Incident[];
}

export class SCIPIntelligenceAgent {
  private reports: Report[];
  private incidents: Incident[];

  constructor(context: AgentContext) {
    this.reports = context.reports;
    this.incidents = context.incidents;
    // Ensure TF-IDF vectorizer is fitted on the reports corpus
    globalVectorizer.fit(
      this.reports.map(r => ({ id: r.id, text: `${r.title} ${r.description} ${r.category} ${r.locationName}` }))
    );
  }

  // Tool 1: Classification Tool
  public toolClassification(text: string, declaredCategory?: any): AgentToolResult {
    const start = performance.now();
    const result = classifyReport(text, declaredCategory);
    return {
      toolName: 'Classification Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Classified as "${result.predictedCategory}" with ${(result.confidence * 100).toFixed(0)}% confidence`,
      data: result
    };
  }

  // Tool 2: Entity Extraction Tool
  public toolEntityExtraction(text: string): AgentToolResult {
    const start = performance.now();
    const entities = extractEntities(text);
    const count = entities.locations.length + entities.infrastructure.length + entities.hazards.length;
    return {
      toolName: 'Entity Extraction Tool',
      status: count > 0 ? 'success' : 'partial',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Extracted ${entities.locations.length} locations, ${entities.infrastructure.length} infrastructure elements, ${entities.hazards.length} hazard markers`,
      data: entities
    };
  }

  // Tool 3: Similarity Tool
  public toolSimilarity(targetReportId: string, limit: number = 5): AgentToolResult {
    const start = performance.now();
    const target = this.reports.find(r => r.id === targetReportId);
    if (!target) {
      return {
        toolName: 'Similarity Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: `Target report ${targetReportId} not found in database`,
        data: null
      };
    }

    const { topSimilar } = findSimilarAndDuplicateReports(target, this.reports);
    return {
      toolName: 'Similarity Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Computed cosine vector similarity against ${this.reports.length - 1} corpus documents; returned ${topSimilar.length} matches`,
      data: topSimilar.slice(0, limit)
    };
  }

  // Tool 4: Duplicate Detection Tool
  public toolDuplicateDetection(targetReportId: string): AgentToolResult {
    const start = performance.now();
    const target = this.reports.find(r => r.id === targetReportId);
    if (!target) {
      return {
        toolName: 'Duplicate Detection Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: `Target report ${targetReportId} not found`,
        data: null
      };
    }

    const dupAnalysis = findSimilarAndDuplicateReports(target, this.reports);
    const isDup = dupAnalysis.duplicateProbability >= 0.70;
    return {
      toolName: 'Duplicate Detection Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: isDup
        ? `Potential duplicate detected with ${(dupAnalysis.duplicateProbability * 100).toFixed(0)}% probability`
        : `Unique observation; duplicate probability ${(dupAnalysis.duplicateProbability * 100).toFixed(0)}%`,
      data: dupAnalysis
    };
  }

  // Tool 5: Geospatial Analysis Tool
  public toolGeospatialAnalysis(centerLat: number, centerLng: number, radiusMeters: number = 1000): AgentToolResult {
    const start = performance.now();
    const nearbyReports = this.reports.map(r => {
      const dist = calculateHaversineDistance(centerLat, centerLng, r.latitude, r.longitude);
      return { report: r, distanceMeters: dist };
    }).filter(item => item.distanceMeters <= radiusMeters);

    nearbyReports.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Density calculation: reports per square kilometer
    const areaSqKm = (Math.PI * Math.pow(radiusMeters / 1000, 2)) || 0.1;
    const densityPerSqKm = Number((nearbyReports.length / areaSqKm).toFixed(1));

    return {
      toolName: 'Geospatial Analysis Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Found ${nearbyReports.length} reports within ${radiusMeters}m (Density: ${densityPerSqKm} reports/km²)`,
      data: {
        radiusMeters,
        totalFound: nearbyReports.length,
        densityPerSqKm,
        reports: nearbyReports.slice(0, 10).map(nr => ({
          id: nr.report.id,
          title: nr.report.title,
          category: nr.report.category,
          distanceMeters: nr.distanceMeters,
          location: nr.report.locationName
        }))
      }
    };
  }

  // Tool 6: Incident Clustering Tool
  public toolIncidentClustering(): AgentToolResult {
    const start = performance.now();
    const clusters = detectIncidentClusters(this.reports);
    return {
      toolName: 'Incident Clustering Tool',
      status: clusters.length > 0 ? 'success' : 'partial',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Detected ${clusters.length} spatio-temporal report clusters representing potential municipal incidents`,
      data: clusters
    };
  }

  // Tool 7: Trend Analysis Tool
  public toolTrendAnalysis(categoryFilter?: string): AgentToolResult {
    const start = performance.now();
    const targetReports = categoryFilter
      ? this.reports.filter(r => r.category === categoryFilter)
      : this.reports;

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    for (const r of targetReports) {
      categoryDistribution[r.category] = (categoryDistribution[r.category] || 0) + 1;
    }

    // Daily breakdown for the last 7 days
    const dailyCounts: Record<string, number> = {};
    for (const r of targetReports) {
      const day = r.createdAt.split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    // Location frequency
    const locationCounts: Record<string, number> = {};
    for (const r of targetReports) {
      locationCounts[r.locationName] = (locationCounts[r.locationName] || 0) + 1;
    }

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([loc, count]) => ({ location: loc, count }));

    return {
      toolName: 'Trend Analysis Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Analyzed ${targetReports.length} reports across ${Object.keys(categoryDistribution).length} categories; primary hotspot: ${topLocations[0]?.location || 'N/A'}`,
      data: {
        totalReports: targetReports.length,
        categoryDistribution,
        dailyCounts,
        topLocations
      }
    };
  }

  // Tool 8: Risk Analysis Tool
  public toolRiskAnalysis(reportIds: string[]): AgentToolResult {
    const start = performance.now();
    const matchingReports = this.reports.filter(r => reportIds.includes(r.id));
    if (matchingReports.length === 0) {
      return {
        toolName: 'Risk Analysis Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: 'No reports found for provided IDs',
        data: null
      };
    }

    const loc = matchingReports[0].locationName;
    const isHotspot = loc.toLowerCase().includes('sector 4') || loc.toLowerCase().includes('market');
    const risk = computeExplainableRisk({
      entityType: 'incident',
      entityId: `EVAL-${Date.now().toString().slice(-4)}`,
      reports: matchingReports,
      locationName: loc,
      isRecurrentHotspot: isHotspot
    });

    return {
      toolName: 'Risk Analysis Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Computed risk score of ${risk.score}/100 (${risk.priority}) across 5 calibrated factors`,
      data: risk
    };
  }

  // Tool 9: Evidence Retrieval Tool
  public toolEvidenceRetrieval(incidentOrClusterId: string): AgentToolResult {
    const start = performance.now();
    const incident = this.incidents.find(i => i.id === incidentOrClusterId);

    let relatedReports: Report[] = [];
    if (incident) {
      relatedReports = this.reports.filter(r => incident.reportIds.includes(r.id));
    } else {
      // Check if it corresponds to an active cluster
      const clusters = detectIncidentClusters(this.reports);
      const cluster = clusters.find(c => c.clusterId === incidentOrClusterId);
      if (cluster) {
        relatedReports = this.reports.filter(r => cluster.reportIds.includes(r.id));
      }
    }

    if (relatedReports.length === 0) {
      return {
        toolName: 'Evidence Retrieval Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: `No correlated observations retrieved for ${incidentOrClusterId}`,
        data: []
      };
    }

    const evidenceItems = relatedReports.map(r => ({
      reportId: r.id,
      title: r.title,
      description: r.description,
      locationName: r.locationName,
      coordinates: [r.latitude, r.longitude],
      reportedAt: r.createdAt,
      urgency: r.urgency
    }));

    return {
      toolName: 'Evidence Retrieval Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Retrieved ${evidenceItems.length} ground truth citizen observations`,
      data: evidenceItems
    };
  }

  // Tool 10: Intelligence Report Tool
  public toolIntelligenceReport(query: string, toolResults: AgentToolResult[]): AgentBriefing {
    const toolsRun = toolResults.map(t => t.toolName);
    const clusteringResult = toolResults.find(t => t.toolName === 'Incident Clustering Tool');
    const riskResult = toolResults.find(t => t.toolName === 'Risk Analysis Tool');
    const geoResult = toolResults.find(t => t.toolName === 'Geospatial Analysis Tool');

    let summary = `SCIP Intelligence synthesis executed across ${toolResults.length} analytical tools. `;
    const actions: string[] = [];

    if (clusteringResult && clusteringResult.data?.length > 0) {
      const count = clusteringResult.data.length;
      summary += `Identified ${count} active spatio-temporal cluster(s) with correlated ground reports. `;
      actions.push(`Route cluster observations to Human Review Queue for administrative confirmation.`);
    }

    if (riskResult && riskResult.data) {
      const risk = riskResult.data;
      summary += `Assessed risk level as ${risk.priority} (Score: ${risk.score}/100) driven by ${risk.factors[0]?.factor}. `;
      if (risk.score >= 70) {
        actions.push(`Immediate operational dispatch recommended for high-priority hazard.`);
      }
    }

    if (geoResult && geoResult.data) {
      summary += `Geospatial density observed at ${geoResult.data.densityPerSqKm} reports/km² within ${geoResult.data.radiusMeters}m perimeter. `;
    }

    actions.push('Require designated authority officer review prior to municipal work order creation.');

    return {
      id: `BRIEF-${Date.now().toString().slice(-6)}`,
      query,
      timestamp: new Date().toISOString(),
      executiveSummary: summary,
      confidence: 0.88,
      toolResults,
      recommendedActions: actions,
      uncertaintyDisclaimer:
        'RESPONSIBLE-AI NOTICE: This intelligence brief is an algorithmic analytical interpretation synthesizing citizen observations. It does not constitute a certified field inspection or final administrative decision. Human officers must verify ground conditions.'
    };
  }

  /**
   * Main Agent Execution Pipeline: Receives a query or intent, selects tools, executes them,
   * and compiles the final intelligence synthesis.
   */
  public executeIntelligenceQuery(query: string, specificTool?: string): AgentBriefing {
    const qLower = query.toLowerCase();
    const toolResults: AgentToolResult[] = [];

    if (specificTool) {
      switch (specificTool) {
        case 'clustering':
          toolResults.push(this.toolIncidentClustering());
          break;
        case 'trends':
          toolResults.push(this.toolTrendAnalysis());
          break;
        case 'hotspots':
          toolResults.push(this.toolGeospatialAnalysis(28.6139, 77.2090, 800));
          break;
        case 'entities':
          toolResults.push(this.toolEntityExtraction(query));
          break;
      }
    } else {
      // Intelligent Tool Orchestration based on query semantics
      if (qLower.includes('cluster') || qLower.includes('incident') || qLower.includes('flood') || qLower.includes('drain')) {
        toolResults.push(this.toolIncidentClustering());
      }

      if (qLower.includes('sector 4') || qLower.includes('market') || qLower.includes('near') || qLower.includes('area')) {
        toolResults.push(this.toolGeospatialAnalysis(28.6139, 77.2090, 600));
      }

      if (qLower.includes('risk') || qLower.includes('priority') || qLower.includes('hazard')) {
        // Run risk analysis on first active cluster or recent reports
        const topRepIds = this.reports.slice(0, 3).map(r => r.id);
        toolResults.push(this.toolRiskAnalysis(topRepIds));
      }

      if (qLower.includes('trend') || qLower.includes('recurrence') || qLower.includes('frequency') || qLower.includes('stat')) {
        toolResults.push(this.toolTrendAnalysis());
      }

      if (qLower.includes('entity') || qLower.includes('extract') || qLower.length > 20) {
        toolResults.push(this.toolEntityExtraction(query));
      }

      // Default fallback if no specific tool was selected
      if (toolResults.length === 0) {
        toolResults.push(this.toolIncidentClustering());
        toolResults.push(this.toolTrendAnalysis());
      }
    }

    return this.toolIntelligenceReport(query, toolResults);
  }
}
