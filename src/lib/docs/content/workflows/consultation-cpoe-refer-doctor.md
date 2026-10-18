---
title: "Refer Doctor"
description: "Step-by-step guide for Refer Doctor in Consultation."
docType: workflow
slug: workflows/consultation-cpoe-refer-doctor
pageId: 1400001
moduleId: 6
pageUrl: "/medora/home/consultation/cpoe/refer/doctor"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T02:51:11.495Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Refer Doctor** is where you record and review work in **Consultation**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.
- A patient visit is open (you picked a visit from the list).

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Consultation"]
  s2["Open Refer Doctor"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Consultation** module icon.

On the Consultation home screen, open **Refer Doctor**.

Open the **Refer** section, then the **Refer Doctor** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Refer Doctor (1920x1080, module bar and form)](/docs/capture/workflows/consultation-cpoe-refer-doctor/step-01-overview.png)
*Refer Doctor (1920x1080, module bar and form)*

## If something goes wrong

- **Blank clinical screen:** select a patient visit from the visit list, then open this page again.
- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
