# AGENTS.md – Articul8

Read this first. Keep this file under 150 lines. Details live in docs/.

## What this is
Study and focus app for students. A web frontend (plain HTML/CSS/JS) plus a
backend that will call users at the times they chose (voice call feature).

## Reading order (this is our "AI passport")
1. AGENTS.md            rules and map (this file)
2. docs/architecture.md which file does what, how data flows
3. docs/design.md      the look: tokens and components to reuse
4. docs/decisions/      why we built it this way (ADRs)
5. docs/plans/          what we are about to build, written BEFORE coding
   (docs/backend-overview.md: the backend on one page, in plain words)

## Layout
- frontend/index.html   FROZEN. Single-file UI, taken over as-is (ADR 0001, 0007).
- backend/src/          API, scheduler, provider adapters (Python, FastAPI)
- backend/tests/        tests, mirror the src/ layout
- docs/                 architecture, decisions, plans
- .env.example          list of required secrets, no real values

## Rules
- Team workflow: never work on `main`. Use a short-lived branch
  (feat/, fix/, docs/), open a pull request, let the teammate review it, no
  force-push. Do not rewrite shared history.
- Think first: any new feature gets a plan in docs/plans/<name>.md and a
  human "go" before code is written.
- Never create new buttons, colors or layouts: reuse docs/design.md.
- A Concentr8 function without a wireframe from Jack is built from existing
  classes and marked "AI generated" (`.preview-note` plus an `AI-GENERATED:`
  comment), so Jack can redraw it.
- Do not edit frontend/index.html unless the plan says so and a human agrees.
- Secrets (API keys, tokens) live only in backend/.env. Never in the frontend,
  never in git, never in logs. Add new names to .env.example.
- Phone numbers are personal data. Do not log them in full, do not put real
  ones in tests or docs. Use +15555550100 style fake numbers.
- Code must be easy to read: small functions, plain names, and comments that
  explain WHY. Every file starts with a header comment: purpose, who calls it,
  what it calls.
- Mark unfinished parts with `TODO:` and say what is missing.
- Keep the repo tidy: no dead code, no commented-out code, no backup copies.
- No new dependency without asking. List it in backend/requirements.txt.
- Every change that adds, moves or removes a file updates docs/architecture.md
  in the same pull request.
- Every non-trivial decision gets an ADR in docs/decisions/ (one per file).
  Do not reverse an ADR silently; write a new one that supersedes it.
- Cleanup PRs keep behaviour identical: clarity over shortness, one kind of
  change per PR, and a check that proves nothing changed (tests, or before/after
  screenshots for the frontend). Say what you left alone and why.
- Never delete files or run destructive git commands without asking.

## Run (backend, once implemented)
    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp ../.env.example .env        # then fill in values
    uvicorn src.main:app --reload
    pytest

## Before finishing a task
- Run pytest. Summarise what changed and which docs were updated.
