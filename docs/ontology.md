# SupplyGraph AI — Supply Chain Ontology Specification

The Supply Chain Ontology formally defines the business entity schema, relationship graphs, and join constraints that underpin the semantic layer.

---

## 1. Entities

1. **Supplier**: External manufacturer supplying parts into the production network.
2. **Part**: Catalog item, raw material SKU, or component assembly.
3. **Plant**: Manufacturing, assembly, or distribution facility.
4. **Customer**: Client ordering finished assemblies and parts.
5. **Order**: Commercial demand requisition.
6. **Shipment**: Physical logistics consignment moving parts.
7. **Inventory**: On-hand stock count and asset valuation snapshot.
8. **Carrier**: Transport provider (Air, Ocean, Rail, Road).
9. **IoTEvent**: Real-time sensor alert streamed from container trackers.

---

## 2. Graph Relationships

| Origin Entity | Relation Name | Target Entity | Cardinality | Primary / Foreign Key |
|---|---|---|---|---|
| `Supplier` | `supplies` | `Part` | N:M | `suppliers.supplier_id` = `supplier_parts.supplier_id` |
| `Part` | `supplied_to / used_at` | `Plant` | N:M | `parts.part_id` = `inventory.part_id` |
| `Customer` | `places` | `Order` | 1:N | `customers.customer_id` = `orders.customer_id` |
| `Order` | `contains` | `Part` | N:1 | `orders.part_id` = `parts.part_id` |
| `Order` | `fulfilled_by` | `Shipment` | 1:N | `orders.order_id` = `shipments.order_id` |
| `Shipment` | `originates_from` | `Supplier` | N:1 | `shipments.supplier_id` = `suppliers.supplier_id` |
| `Shipment` | `delivered_to` | `Plant` | N:1 | `shipments.plant_id` = `plants.plant_id` |
| `Shipment` | `transported_by` | `Carrier` | N:1 | `shipments.carrier_id` = `carriers.carrier_id` |
| `Plant` | `holds` | `Inventory` | 1:N | `plants.plant_id` = `inventory.plant_id` |
| `Shipment` | `generates` | `IoTEvent` | 1:N | `shipments.shipment_id` = `iot_events.shipment_id` |

---

## 3. Governance Rule on Relationship Traversal

The semantic compiler only generates queries that traverse valid, registered ontology edges. Shortcut relationships (e.g., direct `Customer` → `Plant` queries) are explicitly forbidden unless joined through intermediate `Order` and `Shipment` entities.
