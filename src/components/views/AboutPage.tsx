// SCIP Public - About & Responsible AI Charter Page
import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 py-4">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Platform Philosophy & Architecture</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          Smart Community Intelligence Platform (SCIP)
        </h1>
        <p className="text-slate-600 text-sm mt-2 leading-relaxed">
          SCIP is an AI-assisted community intelligence infrastructure. It is NOT simply a passive complaint ticketing system. It transforms fragmented community reports into unified municipal intelligence.
        </p>
      </div>

      {/* The Responsible AI Principles */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">1. Responsible AI Principles</h2>
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-5 space-y-3 text-xs leading-relaxed text-amber-900">
          <div className="font-semibold text-sm text-amber-950">Non-Autonomous Governance Mandate</div>
          <p>
            Municipal administration directly impacts public safety, emergency services, and taxpayer resources. Therefore, SCIP enforces three inviolable boundaries:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-amber-800">
            <li><strong>A community report is an observation:</strong> Citizen submissions represent ground-level perceptual reports of symptoms (e.g. "water is stagnant", "drain is overflowing").</li>
            <li><strong>An AI-generated incident is an analytical interpretation:</strong> Machine learning algorithms cluster observations, detect spatial overlap, and flag potential root causes. These are mathematical interpretations, not established facts.</li>
            <li><strong>An AI recommendation is NOT a final administrative decision:</strong> Public authority officers must review evidence, corroborate physical conditions, and formally confirm incidents before municipal work orders are executed.</li>
          </ul>
        </div>
      </section>

      {/* Spatio-Temporal Clustering & NLP Foundation */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">2. Lightweight & Explainable Intelligence Foundation</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          SCIP does not rely blindly on opaque third-party AI APIs. It runs an explainable, self-contained machine learning pipeline:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">TF-IDF Vector Space & Classification</div>
            <p className="text-slate-600 leading-relaxed">
              Extracts unigram and bigram features after domain stopword pruning and stemming. Maps observations into high-dimensional vector space and scores against municipal category centroids with calibrated confidence.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">Spatio-Temporal DBSCAN Clustering</div>
            <p className="text-slate-600 leading-relaxed">
              Combines great-circle Haversine geospatial proximity (within 500m), temporal proximity (within 48 hours), and semantic text similarity to group related reports into <em>Potential Incidents</em>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">Explainable Multi-Factor Risk Scoring</div>
            <p className="text-slate-600 leading-relaxed">
              Produces a transparent 0-100 risk score and priority rank (P1-P4) by decomposing inherent physical hazards, community report density, public infrastructure impact, and historical area recurrence.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">SCIP Multi-Tool Agent Orchestration</div>
            <p className="text-slate-600 leading-relaxed">
              A 10-tool agent capable of executing classification, entity extraction, duplicate detection, geospatial radius density, cluster detection, recurrence analysis, and decision briefings.
            </p>
          </div>
        </div>
      </section>

      {/* Role-Based Access Control Architecture */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">3. Role-Based Access Control (RBAC)</h2>
        <div className="overflow-hidden border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3">Role</th>
                <th className="p-3">Primary User Persona</th>
                <th className="p-3">Key Permitted Capabilities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              <tr>
                <td className="p-3 font-semibold text-slate-900">Citizen</td>
                <td className="p-3">Residents, neighborhood shop owners, commuters</td>
                <td className="p-3">Submit observations, track status, view local incidents, submit resolution feedback</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Officer</td>
                <td className="p-3">Field engineers, departmental supervisors (PWD, Water, Grid)</td>
                <td className="p-3">Investigate reports, review clusters, record field resolutions, manage assignments</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Authority</td>
                <td className="p-3">Municipal commissioners, operational directors, superintendents</td>
                <td className="p-3">Confirm/dismiss potential incidents, assign departments, access intelligence analytics</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Admin</td>
                <td className="p-3">System administrators, compliance officers</td>
                <td className="p-3">User management, department settings, audit logs, system security events, test suite</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
