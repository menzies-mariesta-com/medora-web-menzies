---
title: "Nursing IPD"
description: "Step-by-step guide for Nursing IPD in Nursing Workbench."
docType: workflow
slug: workflows/nursing-workbench-ipd
pageId: 44
moduleId: 4
pageUrl: "/medora/home/nursing-workbench/ipd"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T02:37:45.204Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Nursing IPD** is where you record and review work in **Nursing Workbench**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Nursing Workbench"]
  s2["Open Nursing IPD"]
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

On the Nursing Workbench home screen, open **Nursing IPD**.

Under **Nursing IPD**, select the **IPD Census** tab (first sub-page opens by default).

_This guide shows the **IPD Census** work area inside **Nursing IPD**._

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Nursing IPD list (1920x1080)](/docs/capture/workflows/nursing-workbench-ipd/step-01-list.png)
*Nursing IPD list (1920x1080)*

### Step 2: Edit a row

Click the **edit** (pencil) icon on a row to change an existing record.

![Edit a row](/docs/capture/workflows/nursing-workbench-ipd/step-04-edit.png)
*Edit a row*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
