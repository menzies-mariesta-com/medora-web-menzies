---
title: "New Booking"
description: "Step-by-step guide for New Booking in ADT."
docType: workflow
slug: workflows/adt-booking-new
pageId: 540001
moduleId: 7
pageUrl: "/medora/home/adt/booking/new"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:32:22.321Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**New Booking** is where you record and review work in **ADT**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open ADT"]
  s2["Open New Booking"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **ADT** module icon.

On the ADT home screen, open **New Booking**.

Open the **Booking** section, then the **New Booking** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![New Booking (1920x1080, module bar and form)](/docs/capture/workflows/adt-booking-new/step-01-overview.png)
*New Booking (1920x1080, module bar and form)*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
