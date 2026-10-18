---
title: "Receipt from store"
description: "Step-by-step guide for Receipt from store in Inventory."
docType: workflow
slug: workflows/inventory-receipt-from-store
pageId: 39
moduleId: 10
pageUrl: "/medora/home/inventory/receipt-from-store"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T04:43:49.790Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Receipt from store** is where you record and review work in **Inventory**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Inventory"]
  s2["Open Receipt from store"]
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

On the Inventory home screen, open **Receipt from store**.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Receipt from store list (1920x1080)](/docs/capture/workflows/inventory-receipt-from-store/step-01-list.png)
*Receipt from store list (1920x1080)*

### Step 2: Edit a row

Click the **edit** (pencil) icon on a row to change an existing record.

![Edit a row](/docs/capture/workflows/inventory-receipt-from-store/step-04-edit.png)
*Edit a row*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
