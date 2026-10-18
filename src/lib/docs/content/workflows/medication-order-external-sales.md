---
title: "External Sales"
description: "Step-by-step guide for External Sales in Medication Order."
docType: workflow
slug: workflows/medication-order-external-sales
pageId: 34
moduleId: 11
pageUrl: "/medora/home/medication-order/external-sales"
generated: false
captureStatus: failed
capturedAt: "2026-10-18T04:38:43.262Z"
captureError: "Table finished loading but has no rows (Showing 0 of 0). Run npm run db:seed:docs-demo (includes inventory demo) or check filters/hospital."
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**External Sales** is where you record and review work in **Medication Order**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.
- A patient visit is open (you picked a visit from the list).

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Medication Order"]
  s2["Open External Sales"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

_Screenshots could not be captured. Run `npm run db:seed:docs-demo`, start the dev server, then re-run docs capture._

## If something goes wrong

- **Blank clinical screen:** select a patient visit from the visit list, then open this page again.
- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
