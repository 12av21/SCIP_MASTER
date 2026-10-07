# SupplyGraph AI — REST API Documentation

The SupplyGraph AI engine provides governed REST endpoints for conversational questions, canonical metric metadata, and database telemetry.

---

## 1. Conversational Query Endpoint

### `POST /api/query`
Processes natural language questions through the governed pipeline (Intent → Ontology → Metric Registry → Semantic AST → Validated SQL → Result).

**Request Body:**
```json
{
  "question": "What is Supplier S001's on-time delivery performance at Plant PL01?",
  "persona": "Procurement"
}
```

**Response:**
```json
{
  "success": true,
  "question": "What is Supplier S001's on-time delivery performance at Plant PL01?",
  "persona": "Procurement",
  "answerSummary": "Supplier S001 achieved an On-Time Delivery (OTD) rate of 93.2% at Plant PL01 based on 559 shipments.",
  "metricResultFormatted": "93.2%",
  "canonicalMetric": {
    "metric_id": "METRIC_SC_001",
    "name": "On-Time Delivery",
    "short_code": "OTD",
    "formula": "on_time_shipments / eligible_shipments",
    "unit": "%",
    "owner": "Supply Chain Governance Council",
    "version": "1.0",
    "status": "Approved"
  },
  "compilationResult": {
    "valid": true,
    "semanticQuery": {
      "metric": "OTD",
      "supplier": "S001",
      "plant": "PL01",
      "time_range": "Q3 2026"
    },
    "generatedSql": "SELECT ROUND(100.0 * SUM(CASE WHEN DATE(sh.actual_delivery_date) <= DATE(sh.promised_date) THEN 1 ELSE 0 END) / COUNT(sh.shipment_id), 1) as metric_result FROM shipments sh JOIN suppliers s ON sh.supplier_id = s.supplier_id WHERE s.supplier_id = 'S001' AND sh.plant_id = 'PL01';"
  },
  "executionTimeMs": 2.45
}
```

---

## 2. Metric Registry Endpoint

### `GET /api/metrics`
Returns all cataloged canonical metrics with formulas and owners.

### `GET /api/metrics/:metric_id`
Returns complete governance metadata, dimensions, and configurable components for a specific metric.

---

## 3. Ontology Metadata Endpoint

### `GET /api/ontology`
Returns all 9 core entities, attributes, and 10 governed relationship edges.

---

## 4. Persona Consistency Endpoint

### `GET /api/consistency-proof`
Executes identical questions across Planning, Procurement, and Logistics, returning side-by-side mathematical parity proof (93.2%).
