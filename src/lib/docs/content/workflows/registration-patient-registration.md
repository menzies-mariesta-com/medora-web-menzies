---
title: "Patient Registration"
description: "Step-by-step guide for Patient Registration in Registration."
docType: workflow
slug: workflows/registration-patient-registration
pageId: 200001
moduleId: 2
pageUrl: "/medora/home/registration/patient/registration"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T02:25:55.374Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Patient Registration** is where you record and review work in **Registration**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Registration"]
  s2["Open Patient Registration"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Registration** module icon.

On the Registration home screen, open **Patient Registration**.

Open the **Patient** section, then the **Patient Registration** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Patient Registration (1920x1080, module bar and form)](/docs/capture/workflows/registration-patient-registration/step-01-overview.png)
*Patient Registration (1920x1080, module bar and form)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
