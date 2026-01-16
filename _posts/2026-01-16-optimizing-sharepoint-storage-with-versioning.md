---
layout: post
title: "Optimizing SharePoint storage with versioning (and estimating the impact safely)"
date: 2026-01-16
categories: [SharePoint, Storage]
tags: [sharepoint, storage, versioning, powershell, m365]
---

## When SharePoint storage suddenly becomes a problem

SharePoint storage rarely becomes a problem gradually.

In most tenants, everything looks fine… until one day it doesn’t.

Typical symptoms:
- Storage alerts start firing
- New sites fail to provision
- Users can’t upload files
- The tenant is suddenly *very* close to its storage limit

When that happens, the root cause is often not user content — it’s **file versioning**.

---

## Versioning is useful… and expensive

Versioning in SharePoint is a good thing.  
It protects users from accidental overwrites and makes recovery easy.

The problem is how it’s commonly configured:

- Very high (or unlimited) version counts
- Versions kept indefinitely
- Large files changing frequently
- No automatic cleanup

Over time, old file versions quietly consume **huge amounts of storage**.

---

## A real-world example

In a recent customer case, SharePoint storage was nearly exhausted.

- Available storage before cleanup: **~90 GB**
- Available storage after cleanup: **~1.3 TB**

No active files were deleted.  
No users were impacted.

The only change was **bringing versioning under control**.

---

## The two controls that actually matter

When optimizing SharePoint storage, two settings make the biggest difference:

### 1. Maximum version count

This limits how many versions of a file are kept.

Instead of keeping hundreds or thousands of versions forever, you might keep:
- The **latest 50 or 100 versions**

For most users, anything beyond that is never accessed.

---

### 2. Maximum version age

This removes *old* versions automatically.

For example:
- Keep versions for **180 or 365 days**
- Purge anything older

This is especially effective for large files that change often.

---

## Automating cleanup at scale

Manually fixing versioning across sites and libraries doesn’t scale.

Microsoft provides a **server-side cleanup mechanism** that:
- Runs safely in the backend
- Does not require enumerating files client-side
- Scales across large tenants

To make this manageable, I built a PowerShell script that:

- Sets tenant-wide versioning defaults
- Submits **batch cleanup jobs per site**
- Uses Microsoft’s supported APIs

You can find the script here:

👉 **SharePoint Versioning Cleanup script**  
https://github.com/ludwigmoeller/techwithludwig/blob/main/Scripts/Sharepoint%20Versioning%20Cleanup.ps1

---

## “But how much storage will this actually free up?”

This is the most important — and most common — question from customers.

And it’s a fair one.

### The wrong approach

Trying to “guess” reclaimable storage client-side by:
- Enumerating versions manually
- Estimating percentages
- Running heuristic calculations

This is **not reliable**, especially when cleanup is handled server-side.

---

## The correct and supported WhatIf approach

Microsoft provides a **Version Usage Report** that shows:

- How much storage is consumed by file versions
- Which versions are eligible for expiration
- The potential impact of version cleanup

This report is generated **inside each site** using a backend job.
The WhatIf mode generates a Version Usage Report inside each site, because that’s how Microsoft’s backend reporting works.
I recommend using a dedicated folder or cleaning up the reports once analysis is complete.

### Important detail

There is **no native API** that returns:
> “Exactly how many bytes would be deleted if I ran the cleanup job”

Instead, the supported flow is:
1. Generate a version usage report
2. Analyze the report
3. Decide whether to proceed with cleanup

---

## What the updated script does in WhatIf mode

The script now supports a safe `-WhatIfOnly` mode.

When enabled, it:

- ❌ Does **not** change tenant settings
- ❌ Does **not** delete any versions
- ❌ Does **not** submit cleanup jobs
- ✅ Generates **Version Usage Reports per site**
- ✅ Tracks report generation status
- ✅ Outputs report URLs to a CSV

This allows customers to:
- Review the data
- Understand the impact
- Approve cleanup with confidence

---

## Cleanup mode (unchanged behavior)

When run **without** `-WhatIfOnly`, the script:

- Applies tenant-wide versioning defaults
- Submits `New-SPOSiteFileVersionBatchDeleteJob` per site
- Lets SharePoint handle cleanup safely in the backend

This is the same supported mechanism Microsoft documents.

---

## Things to consider before running cleanup

Before you enable cleanup in production:

- Validate retention requirements with the business
- Exclude sites or libraries with legal or regulatory needs
- Expect cleanup jobs to take time in large tenants
- Start with reporting first, then cleanup

This is not a “click and forget” operation — but it *is* predictable and safe when planned correctly.

---

## Final thoughts

SharePoint storage problems are often self-inflicted — just very well hidden.

Versioning is powerful, but **unbounded versioning is expensive**.

By:
- Setting reasonable limits
- Using Microsoft’s supported reporting
- Running cleanup jobs deliberately

You can reclaim **hundreds of gigabytes or more**, without impacting users or deleting actual content.

If your tenant is running low on storage, versioning should be one of the **first places you look**.
