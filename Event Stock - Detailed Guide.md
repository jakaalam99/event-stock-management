# EventStock Inventory System: Detailed Architecture & Guide

Welcome to the **EventStock Inventory System**, a premium, high-performance warehouse management platform designed with a "**Vault**" aesthetic. This document provides a comprehensive technical and operational overview of the system's architecture, logic, and features.

---

## 1. Technical Stack & Design Philosophy

- **Framework**: Next.js 16 (Turbopack Enabled) for rapid development and optimized builds.
- **Database**: PostgreSQL with Prisma ORM for type-safe database interactions and robust relational integrity.
- **Styling**: Vanilla Tailwind CSS with a strict **Monochromic Theme** (Black, White, Gray).
- **Icons**: Lucide React for consistent, high-fidelity iconography.
- **Reports**: `xlsx` (Excel) and `jspdf` (PDF) for enterprise-grade data export.
- **Vibe**: The "Vault" aesthetic—minimalist, high-contrast, and focused on operational efficiency.

---

## 2. Database Schema (Prisma)

The system is built on a relational foundation that ensures every unit is tracked from addition to deduction.

### `User` Table
Handles authentication and role-based permissions.
- `id`: Unique cuid.
- `email`: Authenticated unique identifier.
- `password`: Hashed credentials.
- `name`: User's display name for transaction auditing.
- `role`: `ADMIN` or `USER` (Staff).

### `Sku` Table
The core asset registry.
- `id`: Unique cuid.
- `code`: Unique alphanumeric identifier (e.g., "SKU-001").
- `name`: Human-readable product name.
- `quantity`: Real-time stock level.
- `srp`: Suggested Retail Price (IDR).
- `imageUrl`: Optional nullable field for asset visualization.
- `lowStockThreshold`: User-defined alert limit.

### `Transaction` Table
Groups operational movements.
- `type`: `SHOP_OUT` (deduction) or `REVERSAL` (return/correction).
- `status`: `COMPLETED` or `CANCELLED`.
- `groupId`: Used to group multiple SKU movements into a single logic block.

### `TransactionItem` Table
Atomic movements within a transaction.
- `skuId`: Direct relation to the Sku.
- `quantity`: The delta applied to the SKU's total stock.

---

## 3. Roles, Hierarchy & Logic

### 🛡️ Administrator (ADMIN)
The high-level controller with absolute system oversight.
- **Dashboard**: Access to "Intelligence Hub" with full revenue and volume analytics.
- **Management**: Capability to Create/Edit/Delete Users and set permissions.
- **Inventory Control**: Directly edit SKU details (Name, SRP, Thresholds, Images).
- **System Maintenance**: Power to reset transaction history or wipe the inventory database.
- **Exports**: Generate detailed Excel/PDF reports with contribution analysis.

### 👤 Inventory Staff (USER)
The operational front-line focused on day-to-day syncs.
- **Inventory View**: Real-time stock visibility but restricted from editing core SKU metadata (names/prices).
- **Shop-Out**: Primary role is "Rapid Asset Deployment"—selecting items, adding to cart, and confirming transactions.
- **History View**: Audit access to see records, but restricted from system-wide resets.

---

## 4. Core Feature Logic

### 🛒 Shop-Out Matrix (Checkout)
A dynamic, cart-driven flow designed for speed:
- **Visual Feedback**: Temporary "Added!" indicators ensure users know an action was registered without looking away.
- **Floating Cart Drawer**: A top-right floating portal (mobile/tablet) or sticky sidebar (desktop) keeps the cart "above the fold" at all times.
- **Stock Validation**: Prevents adding more items than currently in the physical matrix.

### 📊 Intelligence Hub (Analytics)
Transforming raw movements into strategic insights:
- **Real-time Revenue**: Calculated as `Total Revenue - Total Reversals`.
- **SKU Contribution (Pareto Analysis)**: Ranks items by their percentage impact on total global revenue and volume.
- **Global Stock Tracking**: Aggregated metric showing the total current volume across the entire warehouse.

### 📜 History & Reversals (Audit Trail)
- Every transaction is logged with timestamps and user attribution.
- **Reversal Logic**: Admins can "Reverse" a SHOT_OUT, which cancels the transaction and automatically restores the specific quantity back to the SKU's global stock.

---

## 5. Connection & API Flow

1. **Client**: React (Next.js) handles state management for the Cart and Analytics visualization.
2. **Gateway**: API Routes (`/api/auth`, `/api/skus`, `/api/transactions`) validate session roles via server-side logic and `AuthGuard` components.
3. **ORM**: Prisma translates these requests into optimized SQL queries.
4. **Data flow for Shop-Out**:
   - Client sends SKU IDs and Quantities.
   - API creates a Transaction record.
   - API creates TransactionItems.
   - API performs a batch decrement of the `Sku.quantity` in a single atomic database transaction.

---

## 6. Premium Monochromic Design System

The system avoids "generic" colors in favor of a curated monochromatic scale:
- **#000000 (Pure Black)**: Primary backgrounds (Mobile Header, Sidebar) and emphasized call-to-actions.
- **#FFFFFF (Pure White)**: Workspace backgrounds and primary contrast text.
- **#171717 / #404040 (Grays)**: Borders, secondary text, and interactive hover states.
- **Animations**: Subtle `bounce`, `fade-in`, and `scale-in` transitions give the application a "living" yet professional feel.

---
*Created by Antigravity for EventStock Management.*
