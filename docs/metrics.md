# SupplyGraph AI — Canonical Metric Registry Specification

All business metrics in SupplyGraph AI are centrally registered and managed by the Supply Chain Governance Council.

---

## 1. Approved Canonical Metrics

### METRIC_SC_001: On-Time Delivery (OTD)
- **Short Code**: OTD
- **Business Definition**: Percentage of eligible shipments delivered on or before the committed promised delivery date.
- **Formula**: `on_time_shipments / eligible_shipments`
- **Unit**: `%`
- **SQL Implementation**: `ROUND(100.0 * SUM(CASE WHEN DATE(actual_delivery_date) <= DATE(promised_date) THEN 1 ELSE 0 END) / COUNT(*), 1)`
- **Owner**: Supply Chain Governance Council & Logistics COE
- **Version**: 1.0 (Approved)
- **Source Entities**: `Shipment`, `Supplier`, `Plant`, `Carrier`
- **Allowed Dimensions**: `supplier_id`, `plant_id`, `carrier_id`, `region`, `time_period`

---

### METRIC_SC_002: Order Fill Rate
- **Short Code**: Fill Rate
- **Business Definition**: Total parts quantity delivered divided by total parts quantity ordered across matching consignment orders.
- **Formula**: `quantity_delivered / quantity_ordered`
- **Unit**: `%`
- **SQL Implementation**: `ROUND(100.0 * SUM(quantity_delivered) / SUM(quantity_ordered), 1)`
- **Owner**: Supply Chain Operations & Order Fulfillment
- **Version**: 1.0 (Approved)
- **Source Entities**: `Shipment`, `Order`, `Part`, `Supplier`

---

### METRIC_SC_003: Days of Inventory (DOI)
- **Short Code**: Days Inventory
- **Business Definition**: Current aggregate on-hand inventory quantity divided by the 90-day trailing average daily demand consumption.
- **Formula**: `current_inventory / average_daily_demand`
- **Unit**: `days`
- **SQL Implementation**: `ROUND(CAST(SUM(i.inventory_quantity) AS FLOAT) / MAX(1.0, (SELECT SUM(o.quantity) / 90.0 FROM orders o)), 1)`
- **Owner**: Integrated Business Planning (IBP)
- **Version**: 1.0 (Approved)
- **Source Entities**: `Inventory`, `Plant`, `Part`, `Order`

---

### METRIC_SC_004: Total Landed Cost
- **Short Code**: Landed Cost
- **Business Definition**: Sum of purchase invoice cost plus freight carriage, customs tariffs/duties, cargo insurance margin (1.5%), and dock handling charges.
- **Formula**: `purchase_cost + freight_cost + duty_cost + insurance_cost + handling_cost`
- **Unit**: `USD`
- **Configurable Components**:
  - Purchase Cost: Unit Cost × Quantity
  - Freight Cost: Carrier freight charge
  - Duty Cost: Customs tariffs & duties
  - Insurance Cost: 1.5% cargo indemnity
  - Handling Cost: Terminal & warehousing fee
- **Owner**: Strategic Procurement & Corporate Finance
- **Version**: 1.2 (Approved)
- **Source Entities**: `Part`, `Shipment`, `Supplier`, `Plant`

---

### METRIC_SC_005: Late Shipments Count
- **Short Code**: Late Shipments
- **Business Definition**: Absolute count of consignments where actual_delivery_date > promised_date.
- **Formula**: `COUNT(CASE WHEN actual_delivery_date > promised_date THEN 1 END)`
- **Unit**: `count`
- **Owner**: Logistics Operations
- **Version**: 1.0 (Approved)
- **Source Entities**: `Shipment`, `Carrier`, `Supplier`

---

### METRIC_SC_006: At-Risk Supplier Count
- **Short Code**: At-Risk Suppliers
- **Business Definition**: Suppliers with assessed risk_level = 'High' OR trailing OTD < 90%.
- **Formula**: `COUNT(DISTINCT supplier_id WHERE risk_level = High OR OTD < 90%)`
- **Unit**: `count`
- **Owner**: Supplier Risk & Governance
- **Version**: 1.0 (Approved)
- **Source Entities**: `Supplier`, `Shipment`
