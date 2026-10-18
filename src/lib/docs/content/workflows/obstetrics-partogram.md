---
title: "Partogram"
description: "Step-by-step guide for Partogram in Obstetrics."
docType: workflow
slug: workflows/obstetrics-partogram
pageId: 141
moduleId: 14
pageUrl: "/medora/home/obstetrics/partogram"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:12:07.496Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Partogram** is where you record and review work in **Obstetrics**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.
- A patient visit is open (you picked a visit from the list).

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Obstetrics"]
  s2["Open Partogram"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Obstetrics** module icon.

On the Obstetrics home screen, open **Partogram**.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Partogram (1920x1080, module bar and form)](/docs/capture/workflows/obstetrics-partogram/step-01-overview.png)
*Partogram (1920x1080, module bar and form)*

## If something goes wrong

- **Blank clinical screen:** select a patient visit from the visit list, then open this page again.
- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
