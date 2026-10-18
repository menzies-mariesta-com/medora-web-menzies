---
title: "ER Billing"
description: "Close the emergency visit bill before ED discharge."
docType: workflow
slug: workflows/billing-er-billing
pageId: 150004
moduleId: 8
pageUrl: "/medora/home/billing/er-billing"
generated: false
captureStatus: pending
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

# ER Billing

ER Billing uses the same `op_billing` storage as OP billing, scoped to **ED visits**.

Bill lines include nursing-complete service orders, medication internal sales, posted department consumption, and auto ER bed service (when configured under Administration → ER Billing Setup).

Close the bill from this page or **Bill clearance** on the registration row before **Discharge**.
