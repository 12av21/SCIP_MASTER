# SupplyGraph AI — Architecture & Governance Design

“One governed source of truth for supply-chain decisions.”

---

## 1. High-Level Architecture

SupplyGraph AI solves the critical industry challenge where different enterprise teams (Planning, Procurement, Logistics) compute disparate answers for identical business metrics due to fragmented ERP, MES, TMS, and IoT data.

```
                           [ USER QUESTION ]
       ("What is Supplier S001's on-time delivery rate at Plant PL01?")
                                  │
                                  ▼
                   [ INTENT & VOCABULARY RESOLVER ]
            (Maps natural language into structured semantic AST)
                                  │
                                  ▼
                     [ ONTOLOGY KNOWLEDGE GRAPH ]
             (Entities: Supplier, Part, Plant, Shipment, etc.)
                                  │
                                  ▼
                    [ CANONICAL METRIC REGISTRY ]
              (Lookup: METRIC_SC_001 "On-Time Delivery")
                                  │
                                  ▼
                   [ GOVERNED COMPILATION & AST ]
                                  │
               ┌──────────────────┴──────────────────┐
               │                                     │
               ▼                                     ▼
      [ METRIC VALIDATION ]                 [ SAFETY & READ-ONLY CHECK ]
(Verify formula, owner, version)       (Rejects DDL/DML, drops, inserts)
               │                                     │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
                    [ PARAMETERIZED SQL GENERATION ]
                                  │
                                  ▼
                  [ GOVERNED SQL DATABASE ENGINE ]
            (10,000 shipments, 25 suppliers, 10 plants)
                                  │
                                  ▼
                   [ TRUST & EXPLAINABILITY ENGINE ]
        (Answer + Metric + Formula + Filters + Data Lineage)
                                  │
                                  ▼
             [ 93.2% OTD RESULT - 100% CROSS-PERSONA PARITY ]
```

---

## 2. Core Governance Guardrails

1. **Zero Hallucinated Metrics**: The LLM is strictly prohibited from inventing business formulas or calculating metrics directly. Every inquiry must resolve to a cataloged `metric_id` in the canonical Metric Registry.
2. **Read-Only SQL Enforcement**: The query compiler parses and validates generated SQL. Any non-read-only operation (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `PRAGMA`) triggers an immediate governance failure.
3. **Data Lineage Traceability**: Every metric computation can be traced through 6 vertical tiers:
   - Question
   - Canonical Metric Definition
   - Ontology Entity Model
   - Relational Tables
   - Mathematical Expression
   - Validated Output
4. **Persona Consistency Enforcement**: Regardless of whether Planning, Procurement, or Logistics asks about vendor delivery SLAs, the system routes the question through the identical canonical definition (`on_time_shipments / eligible_shipments`) producing the exact same 93.2% result.
