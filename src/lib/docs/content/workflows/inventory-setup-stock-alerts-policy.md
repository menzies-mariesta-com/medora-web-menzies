---
title: "Policy"
description: "Step-by-step guide for Policy in Inventory Setup."
docType: workflow
slug: workflows/inventory-setup-stock-alerts-policy
pageId: 420001
moduleId: 9
pageUrl: "/medora/home/inventory-setup/stock-alerts/policy"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T04:31:08.451Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Policy** is where you record and review work in **Inventory Setup**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Inventory Setup"]
  s2["Open Policy"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Inventory Setup** module icon.

On the Inventory Setup home screen, open **Policy**.

Open the **Stock alerts** section, then the **Policy** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Policy (1920x1080, module bar and form)](/docs/capture/workflows/inventory-setup-stock-alerts-policy/step-01-overview.png)
*Policy (1920x1080, module bar and form)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
