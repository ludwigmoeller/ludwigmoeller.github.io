---

title: "Deploying On-Prem Printers to Entra Joined Devices"
date: 2025-07-14
categories: [Intune, Microsoft 365, Entra ID]
tags: [Intune, Entra ID, PSADT, Printing, Universal Print, Win32 Apps]
image:
path: /assets/img/posts/printdeployment/banner.png
--------------------------------------------------

## The Cloud is Great Until Someone Needs a Printer

For years, deploying printers was one of those things that just worked.

Devices were domain joined.
Print servers were domain joined.
Users were domain joined.

Everybody lived happily ever after.

Then Entra ID joined devices became the norm, and suddenly something as simple as mapping a printer became surprisingly complicated.

If you've ever tried deploying a printer from an on-premises print server to a cloud-managed device, you've probably run into one or more of these challenges:

* Point and Print restrictions
* Driver installation requiring administrative privileges
* Users being prompted for credentials
* Printers installing fine during testing but failing in production
* An increasing urge to convince everyone that PDFs are good enough

Recently I needed a repeatable way to deploy printers from traditional Windows print servers to Entra joined devices managed through Intune.

The result is a PSADT-based deployment package and a web-based configuration tool that removes most of the pain.

## Table of Contents

* [The Challenge](#the-challenge)
* [Why Printer Deployments Fail](#why-printer-deployments-fail)
* [The Approach](#the-approach)
* [Step 1 – Trust the Print Servers](#step-1--trust-the-print-servers)
* [Step 2 – Deploy the Printers](#step-2--deploy-the-printers)
* [Step 3 – Re-Enable Security](#step-3--re-enable-security)
* [Packaging for Intune](#packaging-for-intune)
* [Using the Deployment Generator](#using-the-deployment-generator)
* [What About Universal Print?](#what-about-universal-print)
* [Final Thoughts](#final-thoughts)

## The Challenge

Modern devices are often:

* Entra ID joined
* Intune managed
* Connected directly to the internet

Meanwhile, the print infrastructure is frequently still:

* On-premises
* Hosted on Windows print servers
* Dependent on Point and Print

Unfortunately, Microsoft has tightened Point and Print security considerably over the years, especially following the PrintNightmare vulnerabilities.

Those security improvements are absolutely justified, but they also make automated printer deployments more complicated.

## Why Printer Deployments Fail

The biggest hurdle is typically driver installation.

By default, Windows expects elevated permissions when a printer driver needs to be installed.

Even if:

* The user has access to the printer
* The print server is trusted
* The deployment is automated

Windows may still refuse the installation because the driver installation process requires administrative approval.

For Intune administrators, this often creates an awkward situation where:

* Device configuration is cloud managed
* Printers still depend on on-prem infrastructure
* Users don't have local admin rights

Which is exactly how it should be.

## The Approach

Instead of permanently weakening Point and Print security, the deployment follows a controlled three-step process.

We're using a newer PSADT capability that allows scripts to execute in the logged-on user's context.

That gives us the ability to temporarily configure the required registry settings, install the printers, and then immediately restore the security configuration afterwards.

The process looks like this:

```text
Step 1
↓
Configure Point and Print settings

Step 2
↓
Install printers in user context

Step 3
↓
Restore secure Point and Print configuration
```

## Step 1 – Trust the Print Servers

Before a printer can be installed, Windows must trust the print server.

The deployment temporarily configures:

* Approved print servers
* Point and Print restrictions
* Driver installation behavior

Most importantly, it temporarily disables the requirement for administrative approval when printer drivers are installed from approved servers.

This allows the installation to proceed without granting users local administrator permissions.

## Step 2 – Deploy the Printers

Once the required registry settings are in place, PSADT executes the printer installation in the user's context.

This is the key piece.

Historically, many printer deployments failed because the printer connection was attempted from SYSTEM context.

A printer connection is fundamentally a user action.

Running the installation in user context ensures that:

* The printer is added to the correct user profile
* User-specific printer mappings are created
* Driver installation succeeds against the trusted server

The deployment package supports multiple:

* Print servers
* Printers
* Driver combinations

making it suitable for most environments.

## Step 3 – Re-Enable Security

After the printers are successfully installed, the deployment restores the original security settings.

This means:

* Administrative approval is required again
* Point and Print restrictions are restored
* Only approved print servers remain trusted

The relaxed settings exist only for the duration of the deployment.

## Packaging for Intune

The deployment is built around PSADT, making it straightforward to package as a Win32 application.

Typical deployment flow:

1. Generate the package
2. Package with IntuneWinAppUtil
3. Upload to Intune
4. Assign to users
5. Let the deployment handle the rest

The included detection script validates that the required printers are present before reporting success.

## Using the Deployment Generator

Manually editing printer names, server names, detection rules, and PowerShell scripts gets old very quickly.

To make the process easier, I built a deployment generator:

👉 https://techwithludwig.com/tools/PrintDeployment/

The tool allows you to:

* Add multiple print servers
* Add multiple printers under each server
* Automatically generate the required PowerShell configuration
* Download a ready-to-package PSADT deployment

Instead of editing several files manually, you simply define your print servers and printers through the web interface.

## What About Universal Print?

Before anyone heads to the comments section:

Yes, in many environments I would absolutely recommend Microsoft Universal Print or a similar cloud-native printing solution.

Universal Print removes a lot of the complexity associated with traditional print servers and aligns much better with modern device management.

In this particular case, however, it wasn't an option.

The customer had existing print infrastructure, existing processes, and requirements that made a migration impractical at the time.

Rather than fighting the environment, we focused on creating a secure and repeatable deployment process that worked with the infrastructure already in place.

The result was this PSADT solution and the deployment generator you've seen above.

Since we had already built it, it seemed like a waste to keep it locked away in a customer project, so I've made it available for anyone facing the same challenge.

If it saves you a few hours of troubleshooting, then it has already done its job.

## Final Thoughts

Printer deployments are one of those areas where traditional infrastructure and modern device management still collide.

While cloud-native printing solutions continue to improve, many organizations still rely on on-premises print servers for perfectly valid reasons.

By combining:

* Intune
* Entra ID joined devices
* PSADT
* User-context execution

it's possible to deploy printers reliably without granting users administrative rights or permanently weakening security settings.

And perhaps most importantly:

You only have to configure it once.
