---
title: "IP Billing"
description: "Step-by-step guide for IP Billing in Billing."
docType: workflow
slug: workflows/billing-ip-billing
pageId: 150001
moduleId: 8
pageUrl: "/medora/home/billing/ip-billing"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:38:22.004Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**IP Billing** is where you record and review work in **Billing**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.
- A patient visit is open (you picked a visit from the list).

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open Billing"]
  s2["Open IP Billing"]
  s3["Finish on this screen"]
  s0 --> s1
  s1 --> s2
  s2 --> s3
```

## Walkthrough

### Step 1: Open the screen

Sign in with your hospital account (for docs capture we use the seed admin from `.env`).

Select **Testing Hospital 1** in the hospital selector if prompted.

In the left **module bar**, click the **Billing** module icon.

On the Billing home screen, open **IP Billing**.

Under **IP Billing**, select the **Bill** tab (first sub-page opens by default).

_This guide shows the **Bill** work area inside **IP Billing**._

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![IP Billing overview (1920x1080)](/docs/capture/workflows/billing-ip-billing/step-01-overview.png)
*IP Billing overview (1920x1080)*

## If something goes wrong

- **Blank clinical screen:** select a patient visit from the visit list, then open this page again.
- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
