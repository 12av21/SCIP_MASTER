# SupplyGraph AI — Database Schema & DDL Specification

This document details the relational tables, foreign key constraints, and indexing strategy for SupplyGraph AI.

---

## 1. Tables Overview

| Table Name | Primary Key | Description | Record Count |
|---|---|---|---|
| `suppliers` | `supplier_id` | External parts vendors and component suppliers | 25 |
| `parts` | `part_id` | Manufactured components and raw material SKUs | 100 |
| `plants` | `plant_id` | Manufacturing facilities, hubs, and assembly plants | 10 |
| `customers` | `customer_id` | OEM clients and purchasing enterprises | 50 |
| `carriers` | `carrier_id` | Third-party logistics and intermodal carriers | 5 |
| `orders` | `order_id` | Customer purchase orders | 5,000 |
| `shipments` | `shipment_id` | Physical freight consignments from suppliers to plants | 10,000 |
| `inventory` | `inventory_id` | Facility stock snapshot counts and valuations | 2,000 |
| `iot_events` | `event_id` | Real-time telematics sensor alert readings | 600 |
| `audit_logs` | `audit_id` | Immutable logs of all natural language questions & queries | Dynamic |

---

## 2. Table Schemas & Foreign Keys

### `suppliers`
- `supplier_id` VARCHAR(20) PRIMARY KEY
- `supplier_name` VARCHAR(100) NOT NULL
- `region` VARCHAR(50) NOT NULL (APAC, EMEA, Americas)
- `supplier_tier` VARCHAR(20) NOT NULL (Tier 1, Tier 2, Tier 3)
- `risk_level` VARCHAR(20) NOT NULL (Low, Medium, High)

### `parts`
- `part_id` VARCHAR(20) PRIMARY KEY
- `part_name` VARCHAR(100) NOT NULL
- `category` VARCHAR(50) NOT NULL
- `unit_cost` NUMERIC(10,2) NOT NULL

### `plants`
- `plant_id` VARCHAR(20) PRIMARY KEY
- `plant_name` VARCHAR(100) NOT NULL
- `location` VARCHAR(100) NOT NULL
- `capacity` INTEGER NOT NULL

### `customers`
- `customer_id` VARCHAR(20) PRIMARY KEY
- `customer_name` VARCHAR(100) NOT NULL
- `region` VARCHAR(50) NOT NULL

### `carriers`
- `carrier_id` VARCHAR(20) PRIMARY KEY
- `carrier_name` VARCHAR(100) NOT NULL
- `transport_mode` VARCHAR(20) NOT NULL (Air, Ocean, Rail, Road)

### `orders`
- `order_id` VARCHAR(20) PRIMARY KEY
- `customer_id` VARCHAR(20) REFERENCES customers(customer_id)
- `part_id` VARCHAR(20) REFERENCES parts(part_id)
- `quantity` INTEGER NOT NULL
- `order_date` DATE NOT NULL
- `requested_date` DATE NOT NULL

### `shipments`
- `shipment_id` VARCHAR(20) PRIMARY KEY
- `order_id` VARCHAR(20) REFERENCES orders(order_id)
- `supplier_id` VARCHAR(20) REFERENCES suppliers(supplier_id)
- `plant_id` VARCHAR(20) REFERENCES plants(plant_id)
- `carrier_id` VARCHAR(20) REFERENCES carriers(carrier_id)
- `promised_date` DATE NOT NULL
- `ship_date` DATE NOT NULL
- `actual_delivery_date` DATE NOT NULL
- `quantity_ordered` INTEGER NOT NULL
- `quantity_delivered` INTEGER NOT NULL
- `freight_cost` NUMERIC(10,2) NOT NULL
- `duty_cost` NUMERIC(10,2) NOT NULL
- `handling_cost` NUMERIC(10,2) NOT NULL

### `inventory`
- `inventory_id` VARCHAR(20) PRIMARY KEY
- `plant_id` VARCHAR(20) REFERENCES plants(plant_id)
- `part_id` VARCHAR(20) REFERENCES parts(part_id)
- `inventory_quantity` INTEGER NOT NULL
- `inventory_value` NUMERIC(12,2) NOT NULL
- `snapshot_date` DATE NOT NULL

### `iot_events`
- `event_id` VARCHAR(20) PRIMARY KEY
- `plant_id` VARCHAR(20) REFERENCES plants(plant_id)
- `shipment_id` VARCHAR(20) REFERENCES shipments(shipment_id)
- `event_type` VARCHAR(50) NOT NULL
- `event_timestamp` TIMESTAMP NOT NULL
- `severity` VARCHAR(20) NOT NULL (Info, Warning, Critical)

---

## 3. High Performance Analytical Indexes
- `idx_shipments_supplier_plant`: `(supplier_id, plant_id)`
- `idx_shipments_dates`: `(actual_delivery_date, promised_date)`
- `idx_shipments_carrier`: `(carrier_id)`
- `idx_inventory_plant`: `(plant_id)`
- `idx_orders_customer`: `(customer_id)`
