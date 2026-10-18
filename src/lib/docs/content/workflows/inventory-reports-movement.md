---
title: "Movement log"
description: "Step-by-step guide for Movement log in Inventory."
docType: workflow
slug: workflows/inventory-reports-movement
pageId: 410003
moduleId: 10
pageUrl: "/medora/home/inventory/reports/movement"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T04:48:29.049Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Movement log** is where you record and review work in **Inventory**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Inventory"]
  s2["Open Movement log"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Inventory** module icon.

On the Inventory home screen, open **Movement log**.

Open the **Reports** section, then the **Movement log** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Movement log list (1920x1080)](/docs/capture/workflows/inventory-reports-movement/step-01-list.png)
*Movement log list (1920x1080)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
