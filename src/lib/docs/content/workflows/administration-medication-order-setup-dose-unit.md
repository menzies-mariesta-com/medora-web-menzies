---
title: "Dose unit"
description: "Step-by-step guide for Dose unit in Administration."
docType: workflow
slug: workflows/administration-medication-order-setup-dose-unit
pageId: 350006
moduleId: 1
pageUrl: "/medora/home/administration/medication-order-setup/dose-unit"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:56:29.842Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Dose unit** is where you record and review work in **Administration**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Administration"]
  s2["Open Dose unit"]
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

On the Administration home screen, open **Dose unit**.

Open the **Medication Order Setup** section, then the **Dose unit** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Dose unit list (1920x1080)](/docs/capture/workflows/administration-medication-order-setup-dose-unit/step-01-list.png)
*Dose unit list (1920x1080)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
