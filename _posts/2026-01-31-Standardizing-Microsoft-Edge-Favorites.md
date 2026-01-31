# Standardizing Microsoft Edge Favorites (Without Making Users Hate IT)

Everyone bookmarks the same things.

The intranet.  
The access portal.  
The place where you go when something breaks.

And yet, in most organizations, everyone bookmarks them *differently*. Some users have the right links, some have outdated ones, and some just Google their way through the workday and hope for the best.

This is one of those small things that quietly creates friction.

So let’s fix it — properly — by **centrally managing Microsoft Edge favorites**, while still keeping them **relevant to each user**.

No scripts.  
No extensions.  
No “please bookmark this” emails.

---

## The goal

What we want is surprisingly simple:

- A **single, company-controlled favorites folder**
- Links that **everyone** should have
- Additional links that appear **only** for specific departments
- A setup that scales and doesn’t require constant IT maintenance

And ideally, something users don’t even notice — because it just works.

---

## The idea: layered favorites

The trick is to stop thinking in *one* policy and instead think in **layers**.

### Layer 1 – Global favorites (everyone gets these)

A managed root folder, for example:
Company Resources
├─ MyAccess Portal
├─ Intranet
├─ Employee Handbook
└─ Travel & Expenses


This folder:
- Is enforced by policy
- Cannot be removed by users
- Looks the same for everyone

This is your baseline.

---

### Layer 2 – Department-specific favorites

On top of that baseline, we add **department-specific subfolders**.

For IT users, that might look like this:

Company Resources
└─ IT
├─ Service Desk
├─ Knowledge Base
└─ Entra Admin page


HR, Finance, Sales, and others can get their own folders later — but only if they belong to the right group.

---

## How Edge actually handles managed favorites

Here’s the important bit.

:contentReference[oaicite:0]{index=0} does **not** support conditional logic inside a single favorites policy.

There’s no:
> “If department = IT, then show this folder”

Instead:
- Favorites are defined using JSON
- Policies are assigned to users or groups
- Edge **merges favorites** from all policies that apply

So the “dynamic” behavior comes from **policy assignment**, not from Edge itself.

That’s not a limitation — that’s the design we’re going to lean into.

---

## Creating the global favorites policy

We start with the baseline that everyone gets.

In :contentReference[oaicite:1]{index=1}, create a **Settings Catalog** policy.

### Policy name

Following the naming convention I usually use:
Windows – Config – Edge – Favorites – Global

### Configuration

Navigate to:
Microsoft Edge → Configure favorites

And define:
- One root folder
- The links that should exist for **all users**

### Example JSON

```json
[
  {
    "toplevel_name": "Company Resources"
  },
  {
    "name": "MyAccess Portal",
    "url": "https://myaccess.company.com",
    "parent": "Company Resources"
  },
  {
    "name": "Intranet",
    "url": "https://intranet.company.com",
    "parent": "Company Resources"
  },
  {
    "name": "Employee Handbook",
    "url": "https://handbook.company.com",
    "parent": "Company Resources"
  }
]

Assign this policy to All Users.

Once deployed, every user will see the Company Resources folder in Edge.

Extending favorites for the IT department

Now comes the interesting part.

We don’t touch the global policy.
We don’t copy it.
We don’t modify it.

Instead, we extend it.

Creating the IT favorites policy

Create a second Settings Catalog policy in Intune.

Policy name
Windows – Config – Edge – Favorites – IT


This policy will:

Add an IT subfolder
Contain only IT-related links
Be scoped only to IT users

Defining the IT subfolder

In the IT policy, configure the same setting:

Microsoft Edge → Configure favorites


This time, do not define a top-level folder.

Only define:
The IT folder
The links inside it

Example JSON
[
  {
    "name": "IT",
    "parent": "Company Resources"
  },
  {
    "name": "Service Desk",
    "url": "https://support.company.com",
    "parent": "IT"
  },
  {
    "name": "Knowledge Base",
    "url": "https://kb.company.com",
    "parent": "IT"
  },
  {
    "name": "IT Status",
    "url": "https://status.company.com",
    "parent": "IT"
  }
]


That’s it. No duplication. No magic.
