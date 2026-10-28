# 0012. Heroku for the backend

Status: Proposed
Date: 2026-10-23
Deciders: Jonas, Jack (to review)

## Context
The voice features need a backend that runs when Jonas's laptop is off. GitHub
Pages only serves the frontend. Jonas has the GitHub Student credit for Heroku.

## Decision
Run the backend on Heroku (Eco dyno), started by `backend/Procfile`. Deploy
steps are in docs/deploy-heroku.md. Render (free, also sleeps) stays the fallback.

## Consequences
- Good: no cost while the student credit lasts (24 months); no laptop needed.
- Harder: the app sleeps after 30 minutes without requests; the repo has the
  backend in a subfolder, so a helper buildpack or a subtree push is needed;
  in-memory limits reset on every restart.
