---
layout: post
title: "Optimizing SharePoint storage with versioning limits"
date: 2026-01-16
categories: [SharePoint, Storage]
tags: [sharepoint, storage, versioning, powershell, m365]
---

## Why SharePoint storage suddenly becomes a problem

SharePoint storage rarely becomes a problem gradually.

In most environments, it looks fine… until it doesn’t.

One day you notice:
- Storage alerts firing
- New sites failing to provision
- Users unable to upload files
- Microsoft 365 storage creeping dangerously close to the limit

And when you dig into it, the cause is often **file versioning**.

---

## The hidden cost of versioning

Versioning in SharePoint is a good thing.  
It protects users from accidental overwrites and makes recovery easy.

But by default, many document libraries:
- Keep **hundreds or thousands of versions**
- Keep them **forever**
- Across **every file**, including large binaries

Over time, this quietly consumes massive amounts of storage.

---

## A real-world example

In a recent customer case, SharePoint storage was almost exhausted.

- Remaining storage before cleanup: **~90 GB**
- Remaining storage after cleanup: **~1.3 TB**

No content was deleted.  
No users were impacted.

The only change was **bringing versioning under control**.

---

## The two settings that actually matter

To keep SharePoint storage healthy long-term, two controls are critical:

### 1. Maximum version history

This limits how many versions of a file are kept.

Example:
- Instead of unlimited versions
- Keep the **last 50 or 100**

For most users, anything beyond that is never accessed.

---

### 2. Maximum version age

This removes *old* versions after a defined time period.

Example:
- Keep versions for **180 or 365 days**
- Automatically purge anything older

This is especially effective for large files that change frequently.

---

## Automating cleanup with PowerShell

Manually fixing this across sites and libraries doesn’t scale.

To solve that, I built a PowerShell script that:
- Iterates SharePoint sites
- Applies versioning limits
- Removes excessive and outdated versions safely

You can find the script here:

👉 **SharePoint Versioning Cleanup script**  
https://github.com/ludwigmoeller/techwithludwig/blob/main/Scripts/Sharepoint%20Versioning%20Cleanup.ps1

---

## What the script does (high level)

At a high level, the script:

- Connects to SharePoint Online
- Enumerates document libraries
- Enforces:
  - Maximum version count
  - Maximum version age
- Cleans up excess versions

It focuses on **storage optimization**, not content deletion.

---

## Important considerations before running it

Before you run any cleanup:

- Validate versioning requirements with the business
- Exclude libraries with regulatory or legal retention needs
- Test on a small scope first
- Expect the cleanup to take time in large tenants

This is not a “click and forget” operation — but it *is* predictable and safe when planned properly.

---

## Final thoughts

SharePoint storage issues are often self-inflicted, just very well hidden.

Versioning is powerful, but **unbounded versioning is expensive**.

By setting:
- A reasonable version limit
- A reasonable version age

You can reclaim **hundreds of gigabytes or more**, without impacting users or deleting actual files.

If you’re running low on storage, versioning should be one of the **first places you look**.
