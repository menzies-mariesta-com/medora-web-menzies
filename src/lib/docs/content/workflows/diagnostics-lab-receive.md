---
title: "Lab Receive"
description: "Step-by-step guide for Lab Receive in Diagnostics."
docType: workflow
slug: workflows/diagnostics-lab-receive
pageId: 152
moduleId: 15
pageUrl: "/medora/home/diagnostics/lab/receive"
generated: false
captureStatus: failed
capturedAt: "2026-10-18T03:16:25.042Z"
captureError: "Table did not show at least 1 data row(s) within 30s."
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Lab Receive** is where you record and review work in **Diagnostics**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.
- A patient visit is open (you picked a visit from the list).

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Diagnostics"]
  s2["Open Lab Receive"]
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
