---
title: "Room Master"
description: "Step-by-step guide for Room Master in Administration."
docType: workflow
slug: workflows/administration-room-master
pageId: 47
moduleId: 1
pageUrl: "/medora/home/administration/room-master"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:47:04.002Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Room Master** is where you record and review work in **Administration**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Administration"]
  s2["Open Room Master"]
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

On the Administration home screen, open **Room Master**.

Under **Room Master**, select the **Room Category** tab (first sub-page opens by default).

_This guide shows the **Room Category** work area inside **Room Master**._

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Room Master list (1920x1080)](/docs/capture/workflows/administration-room-master/step-01-list.png)
*Room Master list (1920x1080)*

### Step 2: Edit a row

Click the **edit** (pencil) icon on a row to change an existing record.

![Edit form](/docs/capture/workflows/administration-room-master/step-04-edit.png)
*Edit form*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
