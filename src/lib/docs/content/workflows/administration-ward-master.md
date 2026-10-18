---
title: "Ward Master"
description: "Step-by-step guide for Ward Master in Administration."
docType: workflow
slug: workflows/administration-ward-master
pageId: 45
moduleId: 1
pageUrl: "/medora/home/administration/ward-master"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:44:08.617Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Ward Master** is where you record and review work in **Administration**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Administration"]
  s2["Open Ward Master"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Administration** module icon.

On the Administration home screen, open **Ward Master**.

Under **Ward Master**, select the **Ward Category** tab (first sub-page opens by default).

_This guide shows the **Ward Category** work area inside **Ward Master**._

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Ward Master list (1920x1080)](/docs/capture/workflows/administration-ward-master/step-01-list.png)
*Ward Master list (1920x1080)*

### Step 2: Edit a row

Click the **edit** (pencil) icon on a row to change an existing record.

![Edit form](/docs/capture/workflows/administration-ward-master/step-04-edit.png)
*Edit form*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
