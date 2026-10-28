# 0014. Phone layout added to the frozen frontend

Status: Proposed
Date: 2026-10-23
Deciders: Jonas (go given in chat), Jack (to review)

## Context
ADR 0001 froze the frontend. The page had a fixed minimum width of 760 px, so
it was unusable on phones. Customer interviews will use phones.

## Decision
Add one self-contained style block for widths up to 760 px and two small
script changes (menu starts closed on phones and closes after navigation).
Desktop and tablet stay pixel-identical; this is proven with screenshots.

## Consequences
- Good: the page fits a phone; the change is easy to remove (one block).
- Harder: a second set of rules to keep in line with Jack's design.
- Not yet tested on a real phone (see docs/plans/mobile-layout.md).
