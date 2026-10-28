# 0015. Four ElevenLabs music loops live in the repo

Status: Proposed
Date: 2026-10-23
Deciders: Jonas (made the change himself), Jack (to review)

## Context
The Music page had sample tracks with `url:null`, so nothing played
(docs/plans/music.md). Jonas chose ElevenLabs Music, option A: generate a few
loops once and ship them with the site.

## Decision
Four 3-minute MP3 loops (about 4.3 MB each) sit in `frontend/music/`, one per mix.
`frontend/index.html` points to them (`mixTracks`). One extra fix: the first
Play press on a fresh page now loads the track (before, the audio had no source
until another mix was chosen). Same player, same buttons. GitHub Pages already publishes `frontend/`.

## Consequences
- Good: music works with no backend and no key.
- Harder: audio files add about 17 MB to the repo; more loops will grow it. If
  that becomes a problem, move them to backend or storage (option B).
- Each file must be listed in docs/music-credits.md. Terms: see that file.
