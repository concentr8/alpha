# Research: what makes a focus app feel effortless for students with ADHD

Purpose: the evidence behind the redesign in `docs/plans/simplicity-redesign.md`. Two parts: (A) research on ADHD,
onboarding, motion and WCAG 2.2 AA; (B) a teardown of Things 3, Linear, Raycast, Tiimo and Structured.

How to read it
- Every claim ends with its source. Each link was opened during this research on 2026-11-10; a spot check of six
  links was repeated afterwards (four passed; the two PubMed pages block automated readers, so those two papers link
  to their Europe PMC records instead).
- Evidence tags: **[strong]** peer-reviewed or a W3C standard · **[medium]** expert guidance (NN/g, Apple, Google,
  W3C notes) · **[weak]** practitioner opinion or a tiny study. In part B: [1P] first-party, [3P] third party,
  [Store] App Store page.
- Each part ends with a "Could not verify" list. Nothing on those lists is used as an argument.
- Sources are paraphrased, not quoted.

## What this means for Concentr8 (summary)

| Finding | Strength | Design consequence |
|---|---|---|
| Timing deficits in ADHD are broad (meta-analysis, 55 studies) | strong | Time is always visible as a shape and in words ("due tomorrow", ring), never only as a clock time |
| Working memory is weaker in ADHD (child samples) | strong, children only | The next task, its start button and the timer sit on one screen; nothing has to be remembered across pages |
| Choice overload depends on complexity, time pressure and unclear preference | strong, general population | One next to-do and one filled button on Home; the rule is justified by the student's situation, not by "fewer is always better" |
| Chat has an articulation barrier; buttons and suggestions fix it | medium | "Start focus" is a permanent button; the chat suggests and pre-fills, it never gates the main action |
| Avoid tutorials; ask permissions in context after one line of "why" | medium | No tour. One calendar screen with one reason, shown right after sign-in |
| Swipe or drag needs a click alternative; a swipe alone does not count (WCAG 2.5.7) | strong | To-do rows get a visible checkbox and menu; swipe is only an extra on touch screens |
| 24x24 px is the AA floor; Apple and Google recommend 44 to 48 px on touch | strong / medium | Buttons may look small, but the one main action is 44 px high and no target is under 24 px with spacing |
| Text 4.5:1, control edges and focus rings 3:1 | strong | Every colour token is contrast-checked; grey text has a floor |
| 0.1 s feels instant; feedback animation about 100 ms, larger moves 200 to 300 ms | medium | Local, optimistic updates; three motion durations; every animation has a reduced-motion variant |
| Curated "today", title-only capture, defaults that remember, focus attached to the current task | 5 products | Next card, add row, one-click start with the last used length |
| Black/white/grey, "top 3" and no mood row have **no direct evidence** either way | thin | Kept as hypotheses and tested with five students in Phase 3 |

---

# Part A: ADHD, onboarding, motion, WCAG


### 1. ADHD and interface design

- **Working memory is measurably weaker in ADHD.** A meta-analysis of 26 studies found working-memory deficits in children with ADHD, larger for spatial than verbal tasks, not explained by IQ or language disorders. A later meta-analysis (Kasper 2012) found large deficits in both domains, bigger when the central executive is taxed. Evidence is from children; adult/student data not verified here. [strong, child samples] So for the design: never make the user remember state across screens; show the current task, timer and next step together on one screen. [A meta-analysis of working memory impairments in children with ADHD (Martinussen 2005)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:15782085%20AND%20SRC:MED&resultType=core&format=json) ; [Moderators of working memory deficits in children with ADHD (Kasper 2012)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:22917740%20AND%20SRC:MED&resultType=core&format=json)
- **Time perception differs in ADHD.** A meta-analysis of 55 studies reports broad timing deficits: poorer discrimination of very short intervals, more variability estimating multi-second intervals, lower accuracy in estimation/production tasks. [strong] So for the design: show elapsed and remaining time as a persistent visual, not a number the user must check or remember; do not rely on the user's sense of "how long has this been". [Meta-analysis: altered perceptual timing abilities in ADHD (Marx et al., JAACAP)](https://eprints.soton.ac.uk/456003)
- **Timing deficits are not just "children", but may shift with age.** A 2022 study (n=40) found a sub-second precision deficit but no difference in the seconds range, and notes two earlier meta-analyses found significant timing deficits (one with larger effects for ~5 s and estimation/reproduction tasks). Small sample, so treat age effects as unsettled. [strong for meta-analyses, weak for age claim] So for the design: externalise time at the minutes scale, where a timer actually helps; do not promise "fixes time blindness". [Anobile et al., Scientific Reports 2022](https://link.springer.com/content/pdf/10.1038/s41598-022-05425-2.pdf)
- **Delay aversion / preference for immediate reward is a recognised ADHD pathway.** A placebo-controlled study of 49 children frames delay aversion as a motivational pathway linked to reward circuitry; a second study found real-time (experienced) delays revealed discounting that hypothetical tasks missed, with sex-specific results. Both are child samples, small. [strong but narrow] So for the design: give an immediate, small acknowledgement for each completed action (tick, count, short sound optional), and avoid rewards that arrive only after a long streak. [Shiels et al. 2009, methylphenidate and delay discounting](https://pmc.ncbi.nlm.nih.gov/articles/PMC2908283) ; [Rosch & Mostofsky 2015, delay discounting in ADHD](https://pmc.ncbi.nlm.nih.gov/articles/PMC4780317)
- **Choice overload is real but conditional, not a law.** A meta-analysis of 57 studies found overload is more likely with complex choice sets, time pressure, unclear preferences and a goal of making a final choice; "paralysis" (not choosing) was very erratic across studies. General population, not ADHD. [strong, general population] So for the design: the "one obvious next action" rule fits all four conditions (a student starting a session is under pressure with unclear preference); do not justify it by quoting a simple "fewer options is always better" law. [Kellogg Insight on Chernev et al. choice-overload meta-analysis](https://insight.kellogg.northwestern.edu/article/what-predicts-consumer-choice-overload)
- **W3C COGA guidance lists the exact patterns we want.** The COGA note's objectives include: help users focus (limit interruptions, keep critical paths short, avoid excess content), do not rely on memory (no remembering codes or calculating), avoid mistakes (step-by-step, ability to go back, avoid data loss and timeouts), provide help, and let users control when content moves or changes. [medium] So for the design: use COGA objectives 4, 5, 6 and 8 as the acceptance checklist for every screen. [Making Content Usable for People with Cognitive and Learning Disabilities (W3C)](https://www.w3.org/TR/coga-usable/)
- **Moving or blinking content is called out as distracting for attention deficit groups.** W3C's Understanding doc for 2.2.2 says attention-deficit groups find blinking content distracting; content that auto-moves for over 5 s alongside other content needs pause/stop/hide. [strong, standard] So for the design: no looping ambient animation next to the task; a running timer should update calmly (no per-second pulsing). [Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- **Apple's cognitive guidance matches.** Keep actions simple, prefer familiar system gestures over custom ones, avoid auto-dismissing timed UI, break multistep flows into one interaction per screen, and confirm twice for hard-to-recover actions. [medium] So for the design: toasts that vanish on a timer should not carry essential information or undo. [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md)

---

### 2. Onboarding patterns

- **NN/g advises avoiding onboarding where possible.** Test the app without it first; add only if users struggle and design fixes fail; do not promote features at first launch; show tips in context; defer decisions such as colour themes to settings. [medium] So for the design: ship zero tutorial screens; the first screen is the first working screen. [Mobile-App Onboarding (NN/g)](https://www.nngroup.com/articles/mobile-app-onboarding/)
- **Tutorials mostly fail because they interrupt, get skipped, and tax working memory.** NN/g recommends contextual "pull" help (tooltip or hint shown when the user needs it), easy to dismiss and easy to find again, with progressive disclosure. [medium] So for the design: show a hint at the first encounter of a control (e.g. the first time a task exists), not before. [Onboarding Tutorials (NN/g)](https://www.nngroup.com/articles/onboarding-tutorials/)
- **Progressive disclosure: two levels is typical; more levels confuse.** Put frequent needs on the first level, make the route to advanced options visible and labelled. [medium] So for the design: primary screen = current task + start; everything else (settings, history, integrations) one level away. [Progressive Disclosure (NN/g)](https://www.nngroup.com/articles/progressive-disclosure/)
- **Defer sign-in until the user has seen value.** NN/g reports users were among the most annoyed by early login walls and tend to assume low value when they cannot see content first. [medium] So for the design: let the user create a task and start a focus session before any account step; ask for an account when they need sync or want to keep data. [Login Walls Stop Users in Their Tracks (NN/g)](https://www.nngroup.com/articles/login-walls/)
- **Ask for permissions in context, after a value explanation.** web.dev calls requesting notification permission on page landing the worst approach; use a custom pre-prompt (priming) and trigger the browser prompt only if the user accepts; if blocked, the site cannot ask again. [medium] So for the design: request notification/calendar/OAuth access at the moment the user first uses a feature that needs it (e.g. "remind me when time is up") with one line of "why", and keep a Settings fallback. [Permission UX (web.dev)](https://web.dev/articles/push-notifications-permissions-ux)
- **Empty states should explain and give a direct path.** NN/g: communicate status, teach what the area is for, and give a clear route into the key task (button, not just instructions). [medium] So for the design: the empty task list is the onboarding; one input and one example, nothing else. [Designing Empty States (NN/g)](https://www.nngroup.com/articles/empty-state-interface-design/)
- **Authentication choice matters for this audience.** WCAG 3.3.8 forbids requiring memory or transcription in login unless an alternative exists; passkeys/WebAuthn, OAuth, password managers, email links and pasteable codes are acceptable routes. [strong, standard] So for the design: offer OAuth or email link/passkey; never block paste in code fields. [Understanding SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)

---

### 3. Motion and perceived performance

- **Response-time limits: 0.1 s feels instant, 1 s keeps flow, 10 s is the attention limit.** Past 1 s show that the system is working; beyond 10 s use percent-done and allow interruption. [medium] So for the design: ticking a task or starting a timer must respond within 100 ms (optimistic update); anything over 1 s needs visible feedback. [Response Times: The 3 Important Limits (NN/g)](https://www.nngroup.com/articles/response-times-3-important-limits/)
- **Loading indicators by duration.** NN/g: no indicator under 1 s (skeletons/spinners add jitter), spinner for a single module (~2-10 s), skeleton for full-page loads under 10 s, progress bar above 10 s. [medium] So for the design: no skeleton for sub-second loads; one quiet spinner or skeleton only for the initial app load. [Skeleton Screens 101 (NN/g)](https://www.nngroup.com/articles/skeleton-screens/)
- **Animation duration: about 100 ms for simple feedback, 200-300 ms for larger changes, up to 400 ms max for big moves, avoid above ~500 ms.** More frequent animations should be shorter and subtler; exits shorter than entrances. [medium] So for the design: use 100-200 ms for task completion and 200 ms for panel changes; frequent actions get the shortest. [Executing UX Animations: Duration and Motion Characteristics (NN/g)](https://www.nngroup.com/articles/animation-duration/)
- **`prefers-reduced-motion` is widely available and should replace, not just remove, motion.** MDN: baseline since January 2020; scaling and panning of large objects are common vestibular triggers; the pattern shown swaps a scale pulse for an opacity fade. [strong, platform doc] So for the design: define every animation with a reduced variant (fade or instant) from day one. [prefers-reduced-motion (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- **web.dev: problem motion is mostly decorative (parallax, zoom, reveal); feedback animations and skeletons are fine.** Implement via media query plus `matchMedia` for JS animations (Web Animations API does not auto-update); forcing 1 ms durations is safer than `animation: none` when code depends on `animationend`. [medium] So for the design: keep functional feedback, drop decorative motion; listen to `change` events for JS-driven animation (e.g. the timer ring). [prefers-reduced-motion (web.dev)](https://web.dev/articles/prefers-reduced-motion)
- **WCAG 2.3.3 (AAA, not required for AA) says interaction-triggered motion should be switchable off.** The rationale names distraction and vestibular nausea. [strong, standard; AAA] So for the design: it is cheap to meet, so offer an in-app "calm mode" toggle in addition to honouring the OS setting. [Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- **Apple on Reduce Motion:** replace x/y/z transitions with fades, tighten springs, avoid animating depth and blurs. [medium] So for the design: no bouncy springs on desktop app transitions. [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md)
- **Does motion distract people with attention deficits specifically?** The only direct source found is W3C's 2.2.2 rationale (blinking content is distracting for attention-deficit groups). No ADHD-specific experiment on UI animation was found. [thin evidence] So for the design: apply "less, shorter, calmer" as a precaution, not as a proven ADHD effect. [Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

---

### 4. WCAG 2.2 AA checklist for this app

- **1.4.3 Contrast (AA):** text needs 4.5:1; large text (18 pt or 14 pt bold) 3:1; ratios are not rounded; disabled controls exempt. [strong] So for the design: light-grey secondary text on white is the most likely failure; set the lightest text grey at 4.5:1 or darker (check: roughly #767676 on white is the boundary). [Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **1.4.11 Non-text contrast (AA):** UI component boundaries and state indicators need 3:1 against adjacent colours; a border is not required if visible text or an icon identifies the control, but if the border is the only cue it needs 3:1; focus indicators need 3:1. [strong] So for the design: thin light-grey borders on inputs and cards fail if they are the only boundary; either darken to 3:1 or rely on text/icon plus clear fill. [Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **2.4.7 Focus visible (AA) and 2.4.11 Focus not obscured (AA):** a keyboard focus indicator must be visible and persist; focused controls must not be entirely hidden by sticky headers or banners (fix with `scroll-padding`). [strong] So for the design: define a high-contrast `:focus-visible` ring in the monochrome palette; check sticky header/footer and desktop-app title bars. [Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) ; [Understanding SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- **2.5.7 Dragging movements (AA):** anything done by dragging needs a single-pointer (click/tap) alternative; the alternative cannot be only another path-based gesture such as a swipe. For sortable lists the examples are select-then-move buttons or a menu. [strong] So for the design: swipeable to-do cards need visible buttons or a menu (complete, defer, delete) that do the same thing with a click. [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- **2.5.8 Target size minimum (AA):** pointer targets must be at least 24x24 CSS px, or smaller targets need enough spacing (a 24 px circle centred on each undersized target must not overlap another target); inline links and user-agent-sized controls are exempt. The stricter AAA 2.5.5 uses 44x44. [strong] So for the design: "small buttons" is legal at 24 px with spacing, but see Section 5(d) for why that is a floor, not a target. [Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Platform size guidance is larger.** Apple lists 44x44 pt default and 28x28 pt minimum on iOS, 28 pt default and 20 pt minimum on macOS, with extra spacing (about 12 pt around bezelled and 24 pt around bezel-less elements). Google's Android accessibility help recommends 48x48 dp with at least 8 dp gaps. [medium] So for the design: desktop app: 28 px minimum controls; web touch: 44-48 px. [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md) ; [Android accessibility help: touch target size](https://support.google.com/accessibility/android/answer/7101858)
- **3.2.6 Consistent help (A):** if help or contact options repeat across pages they must keep the same relative order. [strong] So for the design: put "Help/Feedback" in one fixed place in every view. [Understanding SC 3.2.6](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html)
- **3.3.7 Redundant entry (A):** information already entered in the same process must be auto-filled or selectable (exceptions: essential, security, no longer valid). [strong] So for the design: do not ask for the same task name, course or duration twice in a flow. [Understanding SC 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)
- **3.3.8 Accessible authentication (AA):** no cognitive function test (remember, transcribe, puzzle) at any login step without an alternative; OAuth, WebAuthn, password managers, paste and email links are fine. [strong] So for the design: see Section 2; also applies to account recovery. [Understanding SC 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- **2.2.1 Timing adjustable (A):** a time limit set by the content needs turn-off, adjust (at least 10x range) or extend (warning of at least 20 s, extend 10 times); real-time and essential exceptions apply. [strong] So for the design: a user-chosen focus timer that the user starts and can cancel is generally the user's own timer, but any timeout the app imposes (session expiry, auto-dismissed prompts) needs these options; no W3C statement was found that user-set timers are exempt, so confirm with an accessibility reviewer. [Understanding SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)
- **1.4.10 Reflow (AA):** content must work at 320 CSS px width (1280 px at 400% zoom) without two-dimensional scrolling, except content like maps, data tables, games. [strong] So for the design: the web layout must collapse to one column at 320 px, with the timer and primary action still visible. [Understanding SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- **1.4.12 Text spacing (AA):** nothing may clip or overlap when users set line height 1.5, paragraph spacing 2x, letter spacing 0.12 em, word spacing 0.16 em. [strong] So for the design: no fixed-height cards or buttons with hard-clipped text. [Understanding SC 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

---

### 5. Evidence for or against the product rules

**(a) Monochrome black/white/grey palette.**
- Direct evidence is very thin. One small study (20 ADHD and 20 non-ADHD participants aged 15-25, ADHD status from rating forms, preliminary) found that changing hint colours from red/green to blue/yellow lowered performance, most for ADHD users on attention-demanding tasks. That is a colour-pair effect in a game; it says nothing for or against monochrome. [weak] [Silva & Frère 2011, Biomed Eng Online](https://link.springer.com/doi/10.1186/1475-925X-10-74)
- What the standards do say: do not convey information by colour alone (Apple), and for a monochrome UI the risks are contrast (1.4.3, 1.4.11) and weak state signalling. NN/g on empty states and WCAG on borders say controls need clear cues. [medium] [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md)
- For the design: monochrome is defensible as a distraction-reduction choice (supported only by the general COGA focus principle), but it is not evidence-backed for ADHD. If kept, use weight, size and one accent for "the current task" and for state, and pass 4.5:1 and 3:1. Run a quick A/B or preference test with students.

**(b) Show only the top 3 to-dos.**
- No study found that tests a three-item cap. Related support: choice overload is conditional (Section 1), COGA says avoid excess content, and a BBC Science Focus feature quotes psychologists suggesting three small achievable goals a day when overwhelmed, while noting its ADHD content is expert commentary rather than trials. [weak] [How to tackle your to-do list if you struggle with attention (BBC Science Focus)](https://www.sciencefocus.com/science/how-to-tackle-your-to-do-list-if-you-struggle-with-attention)
- Risk not tested in the sources: hidden items may raise anxiety about forgotten tasks (the article mentions the Zeigarnik effect and that a "done" list may help).
- For the design: keep the cap as a hypothesis; provide a visible "N more" entry so nothing feels lost; test with students.

**(c) Swipe as the primary interaction on desktop/web.**
- WCAG 2.5.7 requires a non-dragging single-pointer alternative and says a swipe alone cannot be that alternative. [strong] [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Apple: offer on-screen alternatives to gestures; its own example is a swipe-to-dismiss that also gets a button. [medium] [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md)
- A practitioner article notes swipe actions are not obvious and conflict with screen readers and voice control, and recommends visible buttons or long-press menus plus undo. [weak] [LogRocket: accessible swipe actions](https://blog.logrocket.com/ux-design/accessible-swipe-contextual-action-triggers)
- For the design: swipe can stay as a mobile shortcut, but on desktop/web the primary route should be visible buttons plus keyboard shortcuts; no swipe-discoverability data on desktop was found.

**(d) Small buttons.**
- WCAG AA allows 24x24 CSS px (or spacing exception) because small packed targets harm people with tremor or limited dexterity and raise accidental activation. [strong] [Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Fitts's law: movement time depends on target size and distance; larger targets are faster and more accurate. NN/g's page gives no specific sizes. [medium] [Fitts's Law (NN/g)](https://www.nngroup.com/videos/fittss-law/)
- Platform guides recommend 44-48 px for touch and 28 for macOS minimum (see Section 4). No source found linking ADHD to impulsive mis-taps on small targets; the harm is documented for motor limitations.
- For the design: "small-looking" is feasible if the clickable area is larger than the visible glyph (padding), with the main action (start/complete) at least 44 px.

**(e) Removing the mood check-in.**
- No direct evidence on mood check-ins for ADHD students was found. Adjacent evidence: a UbiComp study of 141 people who stopped using Fitbits found guilt/frustration and loss of interest drive lapses, and that prompting about barriers felt judgemental; guilt-prone users wanted to return, those who found tracking useless did not. Device-tracking, not mood. [strong, but off-topic] [Epstein et al., Reconsidering the Device in the Drawer (UbiComp 2016)](https://www.escholarship.org/content/qt51k9h1mg/qt51k9h1mg.pdf?t=rwq9vt)
- A small preprint survey (n=25, mostly IT workers, author with ADHD) reports dislike of guilt-inducing tools and a wish for quiet, non-judgemental presence. Very weak. [weak] [Toward Neurodivergent-Aware Productivity (arXiv preprint)](https://arxiv.org/html/2507.06864v1)
- For the design: removal is consistent with "less required input before value" (COGA focus; NN/g onboarding), but there is no evidence the check-in itself helps or harms. If the product wants mood data, make it optional and after the session.

**(f) Suggesting tools inside a chat instead of a visible button for the main action.**
- NN/g (Nielsen) argues chat-style, intent-based interfaces have an articulation barrier (users must express needs in prose), are poor for tasks like forms, and expects hybrids that keep clicking and tapping. [medium] [AI: First New UI Paradigm in 60 Years (NN/g)](https://www.nngroup.com/articles/ai-paradigm/)
- NN/g on prompt controls: buttons, cards, conversation starters and suggestions improve discoverability, lower typing and help users past the articulation barrier. [medium] [Prompt Controls in GenAI Chatbots (NN/g)](https://www.nngroup.com/articles/prompt-controls-genai/)
- COGA says to avoid relying on memory and keep critical paths short; a main action that appears only after a user types or reads chat output adds steps. [medium] [W3C COGA](https://www.w3.org/TR/coga-usable/)
- For the design: keep "Start focus" as a permanent visible control; let chat suggest and pre-fill, not gate. No ADHD-specific data on chat vs direct manipulation was found; evidence is general-user expert guidance.

---

### Could not verify (not sourced, not claimed above)

- Hick's law formula and its use for menus: NN/g page returned a client error; only practitioner summaries found. Choice-overload meta-analysis used instead.
- Barkley's "time blindness" theory text, and any controlled study showing visible/visual timers improve ADHD task performance (only vendor pages surfaced).
- Material Design 3 motion duration tokens and 48 dp from m3.material.io (page needs JavaScript). Google's Android accessibility help used for 48 dp instead.
- Optimistic UI as a perceived-performance technique from a primary source; skeleton-vs-spinner is covered by NN/g only.
- Onboarding step count vs completion rates and time-to-value benchmarks from a primary or peer-reviewed source (only vendor blogs surfaced).
- Adult/student-specific working-memory meta-analysis (fetched meta-analyses are child samples) and the Noreika 2013 timing meta-analysis (PMC blocked by a browser check).
- Whether WCAG 2.2.1 exempts a user-started focus timer (not stated on the fetched page).
- Evidence on salient stimuli or colour for task salience in adults with ADHD, and on swipe discoverability on desktop.
- Material Design and NN/g direct statements on `prefers-reduced-motion` timing; only MDN, web.dev and W3C were opened.

---

# Part B: teardown of five reference products

### 1. Things 3 (Cultured Code)

**First run / onboarding.**
- No page could be opened that describes any page describing Things' first-run screens (see "Could not verify"). What is documented: the official guide tells users to put every new to-do in the Inbox first and review it each morning in Today [1P] https://culturedcode.com/things/guide/
- Pricing model: paid app ($9.99 iPhone; Mac/iPad sold separately), so no free-tier/paywall step; sync via Things Cloud is free [Store] https://apps.apple.com/us/app/id904237743
- Calendar connection is optional: you choose which calendars show in Today/Upcoming [1P] https://culturedcode.com/things/features/

**Home / default view.**
- Today is "the list for to-dos you want to start before the day ends"; the guide's routine is to open Today each morning, choose priorities, postpone the rest, order the list [1P] https://culturedcode.com/things/guide/
- Today shows calendar events grouped at the top, to-dos below; a separate "This Evening" list holds tasks for later [1P] https://culturedcode.com/things/features/. MacStories adds that past events turn grey and day and night tasks sit on one screen [3P] https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- "What next" = a manually curated, ordered list; there is no single "next" highlight in the sources (inference: the order of the list is the signal).

**Adding a task.**
- Mac Quick Entry: Ctrl+Space, type title, click Save (3 actions); Cmd+Return saves and closes; Esc discards. Autofill variant stores a link to the current page/mail/file [1P] https://culturedcode.com/things/support/articles/2249437/
- Quick Entry is Mac-only and can file straight into lists/headings [1P] https://culturedcode.com/things/support/articles/2803569
- Magic Plus (mobile): tap to create; drag to a precise position, a heading, or the Inbox target [1P] https://culturedcode.com/things/features/. MacStories calls it the reviewer's favourite part of entry; a name alone is enough, details come later on the task card [3P] https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- Typed dates are parsed ("Tom", "Wed 8pm") via Jump Start [1P] https://culturedcode.com/things/features/

**Timer.** None documented in the sources opened (Things has no focus timer in the pages fetched).

**Motion / feedback / speed.**
- Actions are animated with Cultured Code's own animation toolkit [1P] https://culturedcode.com/things/features/
- MacStories stresses haptics on iPhone (dragging tasks, opening search) as what makes it feel responsive [3P] https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- Mac "Type Travel": start typing to jump to a project/to-do with no search step [1P] https://culturedcode.com/things/features/

**Empty states / defaults / omissions.**
- Opening a to-do shows a clean, blank page; tags, checklists, dates stay hidden until needed [1P] https://culturedcode.com/things/features/
- Deliberate gaps per MacStories: no web API, no iOS file attachments, no iOS keyboard shortcuts, limits on repeating tasks; bulk entry slower than rivals [3P] https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- Empty-state copy for Today/Inbox: not verified.

---

### 2. Linear

**First run / onboarding.**
- Official start guide: try the demo workspace before signing up, optionally join a live onboarding session, create a workspace by signing up with a work email, then follow role-based guides [1P] https://linear.app/docs/start-guide
- A third-party teardown (Candu, dated Nov 2026) says the 2025 flow was seven quick screens, no tour, ending at an empty first issue; it also says Linear now opens to an "Ask Linear..." prompt as home screen with the issue view one setting away. It gives no step-by-step breakdown, so treat as indicative [3P] https://www.candu.ai/blog/linear-onboarding-teardown
- Account/permissions/calendar details of the first-run flow: not verified.

**Home / default view.**
- "My Issues" is a curated view with four tabs (Assigned, Created, Subscribed, Activity). Assigned is grouped in a built-in focus order: urgent, SLA, blockers, cycle work, other active, triage, backlog, completed; within a group, started issues come first, then by priority. The page does not state which tab is default; its screenshot shows Assigned [1P] https://linear.app/docs/my-issues
- Inbox is the notification centre; the Priority tab is the default; keyboard: G then I to open, J/K to move, H to snooze [1P] https://linear.app/docs/inbox
- "What next" = the system sorts for you (opinionated ordering rather than a manual list).

**Adding a task.**
- Press C to open the creation modal; Alt+C creates from a template; also a sidebar icon, linear.new URL, pre-filled URLs [1P] https://linear.app/docs/creating-issues
- Required: team, title, status. Esc offers to save a draft; navigating away saves a local draft; drafts auto-delete after 6 months [1P] https://linear.app/docs/creating-issues
- Creation happens in a modal over the current view (context kept); "Create more" keeps applied fields for rapid multi-entry; Cmd+Enter saves, Cmd+Shift+Enter saves and starts another [1P] https://linear.app/changelog/2021-03-10-new-issue-creation-ui
- Minimum path: C, type title, Cmd+Enter = 3 actions (inference from the two pages above).
- The creating-issues page does not list issue creation as a Cmd+K action; Cmd+K is mentioned for other tasks [1P] https://linear.app/docs/creating-issues

**Timer.** None.

**Motion / feedback / speed.**
- Linear describes itself as fast with most actions available by keyboard or command menu [1P] https://linear.app/learn/intro-to-linear
- Why it feels instant (local replica in IndexedDB, delta sync, optimistic mutations with rollback, granular rendering): only available from a third-party analysis that mixes public statements with its own inference [3P] https://performance.dev/what-makes-linear-feel-instant. Linear's own sync-engine page is only a talk announcement and does not confirm the mechanics https://linear.app/now/scaling-the-linear-sync-engine
- "Linear Method": first-party page lists practices (set direction, scope projects down, generate momentum, write issues not user stories, build with users, etc.) [1P] https://linear.app/method. Their blog says quality depends on creators' talent and how they feel while crafting, and tools should not get in the way of craft [1P] https://linear.app/blog/practices-for-building-linear-is-now-open-for-all

**Empty states / defaults / omissions.**
- Inbox empty-state copy: not described in the docs https://linear.app/docs/inbox
- Minimal required fields (team, title, status) with everything else optional [1P] https://linear.app/docs/creating-issues

---

### 3. Raycast (+ Raycast Focus)

**First run / onboarding.**
- The official quickstart assumes Raycast is already running; it starts with the hotkey and a search, then Action Panel (Cmd+K), a Quicklink, a hotkey, Quick AI (Tab), a store extension, and "explore essentials over several days" [1P] https://manual.raycast.com/quickstart
- First-launch permission/account steps: not verified.

**Home / default view.**
- Search bar is focused on open; Root Search beneath it is "the home screen". With empty search: Favorites first, then recent files and today's calendar events (calendar access needed). Compact Mode shows only the bar until you type [1P] https://manual.raycast.com/search-bar.md
- Ranking learns from use (alias, fuzzy title, then frecency) [1P] https://manual.raycast.com/search-bar.md
- Primary action: type. "What next" = your own favourites and frequent items surfaced.

**Adding a task / command bar.** The command bar is the single entry point: hotkey, type, Enter. Cmd+K opens actions for the selected item; Tab starts Quick AI [1P] https://manual.raycast.com/quickstart. (Raycast is not a to-do app; this is the interaction pattern only.)

**Starting focus (Raycast Focus).**
- Run "Start Focus Session": Goal, Duration (or No Limit), Block/Allow mode, list of apps/sites/categories; submit with Cmd+Enter [1P] https://manual.raycast.com/focus
- "Toggle Focus Session" starts a session with the last-used setup or stops it; hotkey recommended. So repeat start = 1 keypress [1P] https://manual.raycast.com/focus
- New sessions remember previous preferences; floating bar shows time remaining; snooze and pause available [1P] https://www.raycast.com/core-features/focus/?via=jc
- Defaults: snooze 3 min, sound on, restore terminated apps off. Timed sessions auto-complete; sessions pause on sleep; max 24 h; pause offers preset break lengths and a return reminder. Also deeplinks (raycast://focus/start|toggle|complete) and Apple Shortcuts actions; @raycast-focus in AI chat [1P] https://manual.raycast.com/focus
- Marketing page says Focus requires macOS Tahoe and Apple Silicon (as stated on the page) [1P] https://www.raycast.com/core-features/focus/?via=jc

**Motion / feedback / speed.** Search is described as real-time; no performance figures given [1P] https://manual.raycast.com/search-bar.md. Esc/Backspace behaviours make back-out cheap (Backspace on empty search goes back; Esc closes) [1P] same page.

**Empty states / omissions.** Empty = useful (favourites, recents, today's events) rather than blank [1P] https://manual.raycast.com/search-bar.md. Focus built-in categories are curated and not editable (duplicate to customise) [1P] https://manual.raycast.com/focus

---

### 4. Tiimo

**First run / onboarding** (source: screen-by-screen video breakdown, [3P] https://screensdesign.com/apps/tiimo-ai-plan-focus-to-do/, so details may lag current builds):
- Account creation first: social sign-up buttons or email (name, email, password), then email opt-in.
- Personalisation: "biggest need" survey, "are you neurodivergent" question, social proof (500k+ users).
- Paywall early: 7-day trial offer, monthly vs annual.
- Permissions: notifications (warm-up screen before system prompt), full calendar access with chooser of calendars to import, tracking, Apple Health; microphone/speech/photos deferred until the feature is first used.
- Routine setup: pick morning/afternoon/evening habits from chips; optional Reminders import.
- Then rating prompt, a task-completion tutorial with confetti, a streak start, widget and desktop-app prompts, AI planner intro, "what should we call you".
- Count: many screens before a useful action (roughly 7 stages, inference from the list). TWiT's review calls the initial setup "a bit involved" and not fully plug-and-play [3P] https://twit.tv/posts/tech/how-tiimo-makes-task-and-time-management-easier-neurodiverse-users

**Home / default view.** Visual timeline of the day with upcoming tasks at a glance; separate To-do tab for capture; drag to-dos into the day [1P] https://tiimoapp.com/features. Colour-coded schedule with drag and drop [Store] https://apps.apple.com/app/id1480220328

**Adding a task.** Type or speak into the AI Co-Planner (breaks input into steps with time estimates), drag from To-do tab to timeline, or drag-and-drop in the web planner [1P] https://tiimoapp.com/features. TWiT: chat-style brain dump, then sort [3P] https://twit.tv/posts/tech/how-tiimo-makes-task-and-time-management-easier-neurodiverse-users

**Focus timer.** Visual countdown with progress ring and a checklist to stay on one task; Live Activities, widgets, Dynamic Island, Apple Watch ring; daily review carries over unfinished tasks. Positioned for transitions and "time agnosia". The page does not explain how to start it [1P] https://www.tiimoapp.com/product/focus

**Neurodivergent features.** Visual time, 3,000+ colours and custom icons, subtasks/checklists, AI breakdown and prioritisation [1P] https://tiimoapp.com/product. TWiT: gentle non-guilt tone, "pops of joy" rewards [3P] https://twit.tv/posts/tech/how-tiimo-makes-task-and-time-management-easier-neurodiverse-users

**Motion / feedback.** Confetti and streaks in onboarding [3P] https://screensdesign.com/apps/tiimo-ai-plan-focus-to-do/. Elsewhere reward cues per TWiT (above).

**Criticism.**
- App Store reviewers: alerts too brief, forced time slots (want duration-only/unscheduled tasks), Watch logouts, wish for two-way Google Calendar sync, updates sometimes break things [Store] https://apps.apple.com/app/id1480220328
- TWiT: setup learning curve; energetic UI may not suit people who want a very simple planner [3P] https://twit.tv/posts/tech/how-tiimo-makes-task-and-time-management-easier-neurodiverse-users
- Free tier: limited AI chats, 1 profile; 7-day trial yearly only [Store] https://apps.apple.com/app/id1480220328

---

### 5. Structured (day planner)

**First run / onboarding.** Opens to a daily timeline with two starter tasks ("Rise and Shine", "Wind Down") to edit; add your first task via the big plus [1P] https://help.structured.app/en/articles/380546. Account/permission steps: not verified.

**Home / default view.** One daily timeline; bottom tabs: Inbox, Timeline (day/week/month), Structured AI (Pro), Settings; plus button [1P] https://help.structured.app/en/articles/380546. Homepage: one timeline combining tasks, events, focus sessions [1P] https://www.structured.app. Review: colour-coded blocks sized to duration; gaps visible at a glance (this is its main strength) [3P, competitor blog] https://blog.saner.ai/structured-review/

**Adding a task.** Plus (or "Add Task" in a free slot), type title (icon suggested as you type), date defaults to the day being viewed, duration defaults to 15 min, optional alert/subtasks/notes, tap Create Task. Natural-language time/duration in title on iOS. Shortest path about 3 actions (the doc gives no count; the count is the researcher's reading) [1P] https://help.structured.app/en/articles/338050. Inbox holds tasks with no date/time; drag onto the timeline to schedule [1P] https://help.structured.app/en/articles/338178. AI planner: text/voice/scan/upload, review before anything is added (Pro) [1P] https://help.structured.app/en/articles/331074

**Starting focus.** Select the currently running task, tap "Focus Now"; full-screen countdown to the task's end; tapping the time hides seconds; subtasks/notes visible and editable; Live Activity/Dynamic Island. Pomodoro (needs 45+ min left) and Deep Focus (90+) are Pro; Apple devices only; works only for a running task and does not carry to the next [1P] https://help.structured.app/en/articles/331010

**ADHD/neurodivergent features.** Marketed to people with ADHD; visual timeline, colours and icons, Inbox, subtasks; VoiceOver, Voice Control, dyslexia-friendly font [Store] https://apps.apple.com/app/1499198946. Review links timeline to time blindness [3P] https://blog.saner.ai/structured-review/

**Criticism.** Competitor review (saner.ai, treat with caution): iCloud sync failures, calendar-sync reliability as most common complaint, limited web version, no collaboration, can lag on busy days, much value behind Pro, 3-day trial short; "a scheduler, not a complete planning system" [3P] https://blog.saner.ai/structured-review/. Store reviewers praise layout, Inbox, check-off satisfaction; one asks for automatic shifting of later tasks [Store] https://apps.apple.com/app/1499198946

**Defaults/omissions.** Free tier includes timeline, Inbox, subtasks, basic focus timer; calendar connection, recurring tasks, AI and "Replan" are Pro [Store] https://apps.apple.com/app/1499198946

---

### 6. Patterns that make them feel effortless

1. **One focused input as the front door.** Raycast (search bar focused on open), Things (Ctrl+Space Quick Entry), Linear (C opens a modal). Apply: home has one always-focused "Add task" field; Enter = saved; no category/date required. Onboarding "first chat" is the same field.
2. **Required fields minimal, everything else deferred.** Linear (team, title, status), Things (name now, details later), Structured (title; duration defaults 15 min; date defaults to viewed day). Apply: quick add = title only; the app assigns defaults (today, 25 min).
3. **Defaults that remember.** Raycast Focus "Toggle" reuses the last setup; Structured pre-fills date and duration; Linear "Create more" carries fields. Apply: "Start focus" uses last duration/task; one click, change later.
4. **Curated "today" instead of a big backlog.** Things Today (manual priorities, rest postponed), Linear My Issues (auto-ordered focus groups), Structured timeline, Tiimo timeline. Apply: home shows a single "Next" card plus a short list beneath; backlog behind one link (inference on card design).
5. **Capture now, organise later (Inbox).** Things Inbox, Structured Inbox, Tiimo To-do tab. Apply: quick add lands in Inbox; promote one item to "Next" with one click.
6. **Focus attaches to the current task, not a separate setup.** Structured "Focus Now" on the running task, Tiimo timer with checklist, Raycast goal field. Apply: the Next card has a primary "Start focus" button: click 1 = start (default length); click 2 optional = adjust.
7. **Make time visible.** Tiimo ring and countdown, Structured timeline blocks and full-screen countdown. Apply: one ring on the Next card; no clock-reading needed. Option to hide seconds (Structured does).
8. **Keyboard-first, but also reachable by click.** Linear (C, Cmd+Enter, G then I), Things (Ctrl+Space, Type Travel), Raycast (Cmd+K, Cmd+Enter). Apply: single-key shortcuts for add and start focus; shown inline as hints (inference).
9. **Instant response / optimistic UI.** Linear (analysis: local replica, optimistic writes; third-party source), Things (animations, haptics), Raycast (real-time search). Apply: item appears and timer starts before network confirms; sync in background; no spinners.
10. **Deferred permissions and optional integrations, ask in context.** Tiimo defers mic/speech/photos until the feature is used (but front-loads calendar, notifications, tracking, Health); Things lets you choose calendars; Raycast calendar needs access only to show events; Structured gates calendar to Pro. Apply: ask Google sign-in only once; ask calendar permission with a plain reason and a clear "skip"; mic, notifications later.
11. **Useful empty states and a pre-seeded start.** Raycast empty search shows favourites/recents/today's events; Structured ships two starter tasks. Apply: first-chat step prefilled with a suggested first task so the home screen is never blank.
12. **Gentle tone and low-guilt rewards; but avoid front-loaded engagement steps.** Tiimo's non-guilt tone and rewards are praised; its long onboarding (survey, paywall, streak, rating prompt) drew "involved setup" criticism. Apply: keep the reward tiny (check-off animation) and keep onboarding to the 3 steps: Google sign-in, calendar connect (skippable), first chat that creates the first to-do and lands on Home.

#### How patterns map to the target design
- **Home with one next to-do:** patterns 4, 5, 6, 7, 11.
- **1-2 click focus start:** 3, 6, 7, 9 (Raycast toggle = one key; Structured = select task then Focus Now).
- **One-field quick add:** 1, 2, 3, 8 (Things 3 actions; Linear 3 actions).
- **3-step onboarding:** 10, 11, 12 (and 2: ask least, defer the rest).

---

### Could not verify
- Things 3: exact first-run screens/welcome flow and Today/Inbox empty-state copy (no official page fetched describing them); whether Things has any timer (none seen).
- Linear: first-party description of its first-run steps after sign-up; Linear's own explanation of local-first/optimistic updates (the first-party sync page was only a talk announcement; mechanics rely on a third-party analysis that mixes inference); which My Issues tab is default; whether C-modal speed has measured figures.
- Raycast: first-launch permission/account steps; Raycast has no to-do model in the sources, so task-adding is analogy only.
- Tiimo: current onboarding (screensdesign breakdown may be outdated); how the focus timer is started (tap count); published user-research on ADHD efficacy; Trustpilot/Reddit-style criticism beyond App Store reviews and TWiT (not fetched).
- Structured: account/permission steps in first run; independent (non-competitor) criticism; tap count for creating a task is the researcher's reading of the doc, not stated.
- Not fetched: The Verge, Wirecutter, The Sweet Setup pages; no reputable-outlet review of Tiimo or Structured was opened.
- Pricing figures change often and were not re-verified outside the cited store pages.
