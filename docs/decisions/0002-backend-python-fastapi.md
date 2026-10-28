# 0002. Backend in Python with FastAPI

Status: Proposed
Date: 2026-10-20
Deciders: Jonas (to confirm), team

## Context
We need a backend for scheduled calls. Dial offers a Python SDK; ElevenLabs'
outbound-call guide uses Node. TODO: team adds its own reasons and skills.

## Decision
Use Python with FastAPI, organised by feature (src/calls/ holds router,
schemas, service). Settings come from environment variables.

## Consequences
- Good: one language for the API, scheduler and SDKs; readable code; automatic
  API page at /docs.
- Harder: if we choose the ElevenLabs Node relay, we run a second language.
