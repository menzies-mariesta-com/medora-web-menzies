---
title: "Stock alerts"
description: "Step-by-step guide for Stock alerts in Inventory Setup."
docType: workflow
slug: workflows/inventory-setup-stock-alerts
pageId: 42
moduleId: 9
pageUrl: "/medora/home/inventory-setup/stock-alerts"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T04:30:14.225Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Stock alerts** is where you record and review work in **Inventory Setup**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Inventory Setup"]
  s2["Open Stock alerts"]
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

On the Inventory Setup home screen, open **Stock alerts**.

Under **Stock alerts**, select the **Policy** tab (first sub-page opens by default).

_This guide shows the **Policy** work area inside **Stock alerts**._

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Stock alerts (1920x1080, module bar and form)](/docs/capture/workflows/inventory-setup-stock-alerts/step-01-overview.png)
*Stock alerts (1920x1080, module bar and form)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
