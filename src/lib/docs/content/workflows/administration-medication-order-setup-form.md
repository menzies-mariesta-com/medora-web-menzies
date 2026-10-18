---
title: "Form"
description: "Step-by-step guide for Form in Administration."
docType: workflow
slug: workflows/administration-medication-order-setup-form
pageId: 350002
moduleId: 1
pageUrl: "/medora/home/administration/medication-order-setup/form"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:52:49.308Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Form** is where you record and review work in **Administration**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Administration"]
  s2["Open Form"]
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

On the Administration home screen, open **Form**.

Open the **Medication Order Setup** section, then the **Form** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Form list (1920x1080)](/docs/capture/workflows/administration-medication-order-setup-form/step-01-list.png)
*Form list (1920x1080)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
