---
title: "IPD bed transfer and accommodation billing"
description: "How bed transfers create separate billable assignments under one admission."
docType: workflow
slug: workflows/ipd-bed-transfer-billing
generated: false
---

## Mapping to Medora

| Policy concept | Table / module |
| --- | --- |
| Bed assignment | `ipd_bed_stay_segment` (`started_at`, `ended_at`, **price** snapshots only) |
| Transfer | `transferBed` in ADT / nursing; `ipd_bed_history` audit |
| Tariff at assignment | Price snapshots on segment; least-bill rules from live `accommodation_billing_policy` at sync |
| Bill line per assignment | `computeAccommodationCharges` → IP billing sync (`ip_billing_line`, optional `ipd_bed_stay_segment_id`) |

## Rules

- Each **confirmed** transfer closes the open segment and opens a new one at the same UTC instant.
- **Least duration to bill** (qty × timeline unit) comes from **current** IP accommodation policy for **every** segment (each segment still has its own stay window and bed tariff).
- Charges appear when **IP Billing** syncs the open bill for the visit—not at transfer time.
- **Closed** bills are not rewritten; new stay after close may create a new open bill.

## Configuration

1. Bed Master: base price, unit (timeline), room/ward markups.
2. IP accommodation policy: least duration qty + unit (default 1 × Day), accommodation service item.
