---
title: "Admission List"
description: "Step-by-step guide for Admission List in ADT."
docType: workflow
slug: workflows/adt-admission-list
pageId: 530002
moduleId: 7
pageUrl: "/medora/home/adt/admission/list"
generated: false
captureStatus: complete
capturedAt: "2026-10-18T03:29:39.976Z"
sinceVersion: "1.5.0"
lastReviewed: "2026-10-18"
---

## What this screen is for

**Admission List** is where you record and review work in **ADT**. This guide shows the screen and what to tap or click, step by step.

## Before you start

- You are signed in to Medora.
- Your hospital is selected in the top bar.

## Quick map

```mermaid
flowchart LR
  s0["Sign in"]
  s1["Open ADT"]
  s2["Open Admission List"]
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

On the ADT home screen, open **Admission List**.

Open the **Admission** section, then the **Admission List** tab.

The screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).

![Admission List list (1920x1080)](/docs/capture/workflows/adt-admission-list/step-01-list.png)
*Admission List list (1920x1080)*

### Step 2: Edit a row

Click the **edit** (pencil) icon on a row to change an existing record.

![Edit form](/docs/capture/workflows/adt-admission-list/step-04-edit.png)
*Edit form*

## If something goes wrong

- **Blank screen:** run `npm run db:seed:docs-demo` for Testing Hospital 1, then open the sub-tab under the section (for example Document Type under Document Master).
- **Cannot save:** check required fields marked with a red star.

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
