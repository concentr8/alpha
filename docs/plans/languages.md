# Plan: app in German, French and Spanish

Status: ACCEPTED. Jonas answered the decisions on 2026-10-30 (below). Built step by step, after the guest chat.

## Goal
The whole app can be used in English (today), German, French and Spanish: every page, button, message, the
meditation cues, the AI chat and the phone calls.

## What exists today (read from the code, 2026-10-30)
- One page, `frontend/index.html` (about 2300 lines), with English text written directly into the HTML and into
  JavaScript strings; more strings in `frontend/concentr8-server.js` and `concentr8-blocker.js`.
- No language setting. The only language code is the one for voice input (`navigator.language`).
- Dates and times use `en-US` and the fixed time zone `America/Los_Angeles` in several places. Day boundaries
  are therefore Berkeley time for everybody.
- The chat prompt already says "answer in the language the student writes in" (server/index.js).
- Phone calls: opening lines and the Claude greeting are English; the Cartesia agent has its own prompt and voice.

## Two ways to do it
A. **Keys everywhere**: every string becomes `t('home.title')`. Clean, but it touches nearly every line of
   Jack's page and clashes with every redesign he makes.
B. **Translation layer** (recommended): the English text in the HTML stays the source. `frontend/i18n.js` plus one
   dictionary per language (`i18n/de.js`, `fr.js`, `es.js`: English text -> translation) translate text, `title`,
   `aria-label` and `placeholder` when a page is drawn. Strings with numbers or names use patterns like
   `{n} min`. A new string nobody translated yet simply stays English. Jack's design files change by one script tag.
   Risks: the student's own words (tasks, messages) must never be translated: the layer skips user content, and a
   test proves it. Strings put together in JavaScript need pattern entries.

## Design (way B)
- Language: the browser's language on first visit, switch in Profile, Settings (English, Deutsch, Français, Español),
  saved in the browser. The Settings control is built from existing classes and marked AI generated.
- `<html lang>` follows the choice; dates and numbers use `Intl` with that language.
- A script lists every English string of the app and checks it against the three dictionaries. A test fails when a
  string has no translation, so a new feature cannot quietly ship in English only.
- The Profile, Phone call page gets a language field too (`language` on the student). The server uses it for the
  call's opening line, the Claude greeting and the chat prompt. The Cartesia agent needs a prompt and voice per
  language (dashboard work, documented). TODO: check which languages the Cartesia agent and the ElevenLabs speech
  to text model support, not verified yet.
- The meditation cues are translated as well; ElevenLabs text to speech uses a multilingual model today
  (`eleven_multilingual_v2`), cues are saved per text, so each language is paid once.

## Decisions (Jonas, 2026-10-30)
1. German with "du". French: Jonas answered "du" for both, so French uses "tu" (TODO: confirm with Jonas).
2. Spanish from Spain (`es-ES`).
3. Phone calls speak the chosen language too. The default is English; the student can change it in the settings.
4. Jonas reads all four languages and checks the translations himself.
5. The time zone is no longer fixed: the student can set it in the settings (today the app uses Berkeley time in
   several places and the server stores a time zone per student). Default: the browser's time zone.

## Risks
- Machine-style translation misses tone and ADHD-friendly wording: Jonas's review (decision 4).
- The privacy text is translated but is not legal advice.
- A long string in German or French can break a layout (buttons, sidebar). Check each page on desktop and phone width.

## Steps (after the go)
0. Script that counts and lists all strings (gives the real size of the work).
1. ADR, `i18n.js`, language switch, string check; English only, behaviour unchanged.
2. German. 3. French. 4. Spanish. (One pull request each, screenshots of every page.)
5. Time zone setting in the app (replaces the fixed Berkeley time).
6. Server texts, chat and call openings per language; Cartesia agent per language (default English, set in the settings).

## Done when
Every page and message appears in the chosen language, no user text is touched, the string check passes for all
three languages, and screenshots of each page show no broken layout.
