---
title: "Emergency purchase item"
description: "Pharmacy internal sales and department consumption for an ED visit."
docType: workflow
slug: workflows/emergency-purchase-item
pageId: 125
moduleId: 12
pageUrl: "/medora/home/emergency/purchase-item"
generated: false
captureStatus: pending
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

# Emergency purchase item

Use **Purchase item** from the Emergency registration row menu (requires `visitId`).

1. **Pharmacy** opens Medication Order internal sales for the visit.
2. **Supplies** opens department consumption issue; approved posted lines bill on **ER Billing**.

Charges consolidate on the ER bill with service orders and auto bed fees.
