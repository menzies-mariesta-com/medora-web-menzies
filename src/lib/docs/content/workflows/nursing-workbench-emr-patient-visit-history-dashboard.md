---
title: "Patient Visit History Dashboard"
description: "Step-by-step guide for Patient Visit History Dashboard in Nursing Workbench."
docType: workflow
slug: workflows/nursing-workbench-emr-patient-visit-history-dashboard
pageId: 800008
moduleId: 4
pageUrl: "/medora/home/nursing-workbench/emr/patient-visit-history-dashboard"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T02:36:42.344Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Patient Visit History Dashboard** is where you record and review work in **Nursing Workbench**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Nursing Workbench"]
  s2["Open Patient Visit History Dashboard"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Nursing Workbench** module icon.

On the Nursing Workbench home screen, open **Patient Visit History Dashboard**.

Open the **Nursing OPD** section, then the **Patient Visit History Dashboard** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Patient Visit History Dashboard overview (1920x1080)](/docs/capture/workflows/nursing-workbench-emr-patient-visit-history-dashboard/step-01-overview.png)
*Patient Visit History Dashboard overview (1920x1080)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
