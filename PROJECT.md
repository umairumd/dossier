# Dossier

## Vision

Dossier is an internal operations platform for Inoma Digital.

The first MVP focuses on one problem:

Employees submit an end-of-day work report.

Managers can quickly review everyone's progress.

---

## Goals

- Reduce manual follow-ups
- Increase accountability
- Give founders visibility
- Extremely simple UX
- Mobile friendly

---

## Status

Release Candidate 1 (tagged v0.9.0). Core architecture and all MVP
features below are built and stable — current work is polish and
production-readiness, not new features.

---

## Features

**Authentication & Access**
Invitation-only accounts (no public sign-up), email/password login,
self-service password change, capability-based navigation scoped by role.

**Employee**
Daily report submission, report history, current streak, monthly
completion %, average submission time, profile settings.

**Manager**
Team dashboard (completion today, missing/late reports, streak
leaderboards, activity feed), date-filterable team report browser with
On Time / Late / Missed status, missing-reports view, read-only team
member list.

**Admin**
Organization overview dashboard, employee management (invite, edit,
activate/deactivate, archive/restore, permanently delete), department
management (create/edit/archive/restore/permanently delete, manager
assignment), organization-wide analytics, invitation tracking, an
activity feed, and organization settings (currently: the report
deadline used to compute On Time / Late / Missed).

---

## Non Goals

No project management

No HR system

No payroll

No AI summaries

No leave management

No real-time notifications (activity feeds exist; push/email
notifications do not)

No configurable report templates yet (the report architecture is
prepared for this — see `lib/reports/fields.ts` — but the UI to define
custom templates hasn't been built)

These may come later.

---

## Users

Employee

Manager

Admin

---

## Tech Stack

Next.js 16

React 19

TypeScript

Tailwind v4

Supabase

Vercel

---

## Design Principles

Simple

Fast

Maintainable

Mobile-first

Accessible

Professional UI