---
title: Deploying On-Prem Printers to Entra ID Joined Devices
date: 2026-02-01
categories: [Intune, Printing]
tags: [intune, entra-id, printing, psadt, universal-print, win32-apps]
toc: true
---

If you've been moving devices to Entra ID join and modern management, you've probably discovered that printers are often the last piece of traditional infrastructure still hanging around.

Users are cloud managed.
Applications are cloud managed.
Identity is cloud managed.

Then someone asks for a printer, and suddenly you're dealing with print servers, Point and Print restrictions, driver installation prompts, and a whole lot of frustration.

Recently I needed a repeatable way to deploy printers from traditional on-premises print servers to Entra ID joined devices managed through Intune. The result was a PSADT-based deployment package and a web-based generator that removes most of the manual work.

---

## Table of Contents

1. [The challenge](#the-challenge)
2. [Why printer deployments fail](#why-printer-deployments-fail)
3. [The approach](#the-approach)
4. [Step 1 – Trust the print servers](#step-1--trust-the-print-servers)
5. [Step 2 – Deploy the printers](#step-2--deploy-the-printers)
6. [Step 3 – Restore security settings](#step-3--restore-security-settings)
7. [Packaging for Intune](#packaging-for-intune)
8. [Using the deployment generator](#using-the-deployment-generator)
9. [What about Universal Print?](#what-about-universal-print)
10. [Wrap-up](#wrap-up)

---

<h2 id="the-challenge">The challenge</h2>

Modern devices are often:

- Entra ID joined
- Intune managed
- Connected directly to the internet

Meanwhile, the print infrastructure is frequently still:

- On-premises
- Hosted on Windows print servers
- Dependent on Point and Print

Microsoft has tightened Point and Print security considerably over the years, especially following the PrintNightmare vulnerabilities.

Those changes are absolutely justified, but they also make automated printer deployments more complicated.

---

<h2 id="why-printer-deployments-fail">Why printer deployments fail</h2>

The biggest hurdle is usually driver installation.

By default, Windows expects elevated permissions when a printer driver needs to be installed.

Even if:

- The user has access to the printer
- The print server is trusted
- The deployment is automated

Windows may still refuse the installation because the driver installation process requires administrative approval.

For Intune administrators, this often creates an awkward situation where:

- Device configuration is cloud managed
- Printers still depend on on-prem infrastructure
- Users don't have local administrator rights

Exactly as it should be.

---

<h2 id="the-approach">The approach</h2>

Instead of permanently weakening Point and Print security, the deployment follows a controlled three-step process.

We're utilizing a newer PSADT capability that allows scripts to execute in the logged-on user's context.

This gives us the ability to temporarily configure the required registry settings, install the printers, and then immediately restore the security configuration afterwards.

---

<h2 id="step-1--trust-the-print-servers">Step 1 – Trust the print servers</h2>

Before a printer can be installed, Windows must trust the print server.

The deployment temporarily configures:

- Approved print servers
- Point and Print restrictions
- Driver installation behavior

Most importantly, it temporarily disables the requirement for administrative approval when printer drivers are installed from approved servers.

This allows the installation to proceed without granting users local administrator permissions.

---

<h2 id="step-2--deploy-the-printers">Step 2 – Deploy the printers</h2>

Once the required registry settings are in place, PSADT executes the printer installation in the user's context.

This is the critical piece.

Historically, many printer deployments failed because the printer connection was attempted from SYSTEM context.

A printer connection is fundamentally a user action.

Running the installation in user context ensures that:

- The printer is added to the correct user profile
- User-specific printer mappings are created
- Driver installation succeeds against the trusted server

The deployment package supports multiple print servers and multiple printers.

---

<h2 id="step-3--restore-security-settings">Step 3 – Restore security settings</h2>

After the printers are successfully installed, the deployment restores the original security settings.

This means:

- Administrative approval is required again
- Point and Print restrictions are restored
- Only approved print servers remain trusted

The relaxed settings exist only for the duration of the deployment.

---

<h2 id="packaging-for-intune">Packaging for Intune</h2>

The deployment is built around PSADT, making it straightforward to package as a Win32 application.

Typical deployment flow:

1. Generate the package
2. Package it with IntuneWinAppUtil
3. Upload to Intune
4. Assign to users

The included detection script validates that the required printers are present before reporting success.

---

<h2 id="using-the-deployment-generator">Using the deployment generator</h2>

Manually editing printer names, server names, detection rules, and PowerShell scripts gets old very quickly.

To make the process easier, I built a deployment generator:

👉 https://techwithludwig.com/tools/PrintDeployment/

The tool allows you to:

- Add multiple print servers
- Add multiple printers under each server
- Automatically generate the required PowerShell configuration
- Download a ready-to-package PSADT deployment

Instead of editing several files manually, you simply define your print servers and printers through the web interface.

---

<h2 id="what-about-universal-print">What about Universal Print?</h2>

Before anyone asks: yes, in many environments I would absolutely recommend Universal Print or another cloud-native printing solution.

It removes a lot of the complexity associated with traditional print servers and aligns much better with modern device management.

In this particular customer environment, however, it simply wasn't an option.

The customer had existing infrastructure, existing processes, and requirements that made a migration impractical at the time.

Rather than fighting the environment, we focused on creating a secure and repeatable deployment process that worked with the infrastructure already in place.

Since we'd already built the solution, it felt like a waste to keep it locked away inside a single customer project.

That's why I've made both the deployment package and the generator available publicly. If you're facing the same challenge, hopefully it saves you a few hours of troubleshooting.

---

<h2 id="wrap-up">Wrap-up</h2>

Printer deployments are one of those areas where traditional infrastructure and modern device management still collide.

By combining:

- Intune
- Entra ID joined devices
- PSADT
- User-context execution

it's possible to deploy printers reliably without granting users administrative rights or permanently weakening security settings.

And perhaps most importantly:

You only have to configure it once.

Happy deploying.
