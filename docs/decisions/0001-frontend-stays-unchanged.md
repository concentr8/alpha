# 0001. Frontend stays unchanged

Status: Accepted
Date: 2026-10-20
Deciders: Jonas

## Context
The existing frontend (one HTML file) contains a special workflow the team
wants to keep exactly as it is.

## Decision
frontend/index.html is copied byte for byte and not edited. All new work is in
the backend. Changing the frontend later needs a plan and its own ADR.

## Consequences
- Good: the workflow cannot break by accident.
- Harder: the frontend has no fields for phone number, times or consent yet,
  so the first tests of the call feature go through the API directly.
