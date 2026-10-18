---
title: "Room Category"
description: "Step-by-step guide for Room Category in Administration."
docType: workflow
slug: workflows/administration-room-master-room-category
pageId: 470001
moduleId: 1
pageUrl: "/medora/home/administration/room-master/room-category"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:47:59.289Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Room Category** is where you record and review work in **Administration**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Administration"]
  s2["Open Room Category"]
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

On the Administration home screen, open **Room Category**.

Open the **Room Master** section, then the **Room Category** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Room Category list (1920x1080)](/docs/capture/workflows/administration-room-master-room-category/step-01-list.png)
*Room Category list (1920x1080)*

### Step 2: Edit a row

Click the **edit** (pencil) icon on a row to change an existing record.

![Edit form](/docs/capture/workflows/administration-room-master-room-category/step-04-edit.png)
*Edit form*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
