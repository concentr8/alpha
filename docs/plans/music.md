# Plan: Music for the Music page

Status: BUILT with option A (ADR 0015); Jack to review. Original draft text below. Sources below were read on 2026-10-23.

## Goal
The four mixes on the Music page (Nature, Ambient Piano, Soft Electronic,
Acoustic) play real, legally usable music during a focus session.

## Today (read from frontend/index.html)
- Each mix has sample tracks "Ambient A" to "Ambient D" with `url: null`, so
  nothing plays. There are no audio files in the repo.
- A user can add their own audio files with "Add audio". They stay in that
  browser only.
- Changing this means editing the frozen frontend: a new ADR, and Jack agrees.

## Options
A. **Bundle a few licensed tracks** in the repo (or next to it) and put their
   addresses into the track lists. Simple, no backend. Needs an attribution
   line in the UI for every CC BY track, and the files add to the repo size.
B. **Serve tracks from the backend** later. More work; only worth it when there
   are many tracks or the files should not sit in git.
C. **Keep it as is**: users bring their own files. No legal risk, no new work,
   but the page looks empty at first start.

## Chosen direction (Jonas, 2026-10-23): ElevenLabs, smallest change
Generate 4 to 8 short instrumental loops once with Eleven Music (Jonas, own
paid account, not in the app), save them as files and put their addresses into
the existing track lists. No backend, no live generation, no API key in the
app. This is option A with ElevenLabs as the source. Only the `url: null`
entries in frontend/index.html change; Jack must agree and an ADR is needed.

What we verified (ElevenLabs docs and music terms, read 2026-10-23):
- Length 3 seconds to 5 minutes; MP3 (44.1 kHz) or WAV; instrumental exists.
- The API needs a paid plan. We do not need it for this direction.
- Free plan: commercial use allowed but credit "Eleven Music" is required,
  "For Individual Use Only", and downloads are not permitted. Creator and up:
  no credit required.
- Plans up to Enterprise Music Lite exclude film, TV, radio and Studio Games.
  We are none of these as far as we know.
- Not stated in the terms: whether app users may download or keep the files.
  Rule 4.2 forbids building a "Music Library" that third parties can download.
  Our files would be served from a public website, so a user could download
  them. Open point: ask ElevenLabs support before launch.
- Price of a plan: not checked.

## Other sources (not chosen, kept for comparison)
| Source | What we verified | Open point |
|---|---|---|
| [Free Music Archive](https://freemusicarchive.org/faq/) | Tracks carry Creative Commons licenses. It has a license filter. CC0 and CC BY allow commercial use; the NC licenses do not. CC BY needs credit (title, author, source, license). | Pick only CC0 or CC BY. Old tracks may carry a retired license that forbids redistribution. Read each track's own license. |
| [Pixabay Music](https://pixabay.com/service/faq/) | Credit not required. The FAQ forbids offering tracks as standalone files or in a way that looks like a music service. It does not say anything about music inside apps. | Our Music page is a track gallery, which may look like a music service. Ask Pixabay or skip. Read the license summary page (https://pixabay.com/service/license-summary/), which we did not read. |
| Incompetech (Kevin MacLeod) | Only an old Creative Commons page (2011): credit required unless a paid license is bought. | Read the current terms on incompetech.com before use. |
| Freesound | Not verified (the pages we found were from 2005). | Check the current license list, only use CC0. |

None of this is legal advice. Every track needs its license and source written
down in one list (`docs/music-credits.md`, to be created) before it goes in.

## Decisions needed
1. Direction is set (ElevenLabs loops, see above). Jack must agree.
2. Jonas generates and picks the tracks (4 to 8 short ambient loops, quiet,
   no vocals); which ElevenLabs plan he uses.
3. Where does the credit line go in the UI (Jack's design)?

## Done when
Each of the four mixes plays at least one track that is allowed to be used,
the credit list is complete, and the change to the frontend has its own ADR.
