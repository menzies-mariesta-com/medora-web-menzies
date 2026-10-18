---
title: "Order"
description: "Step-by-step guide for Order in Consultation."
docType: workflow
slug: workflows/consultation-cpoe-order
pageId: 11
moduleId: 6
pageUrl: "/medora/home/consultation/cpoe/order"
generated: false
captureStatus: failed
capturedAt: "2026-10-18T02:48:27.089Z"
captureError: "Table finished loading but has no rows (Showing 0 of 0). Run npm run db:seed:docs-demo (includes inventory demo) or check filters/hospital."
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Order** is where you record and review work in **Consultation**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.
- A patient visit is open (you picked a visit from the list).

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Consultation"]
  s2["Open Order"]
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
