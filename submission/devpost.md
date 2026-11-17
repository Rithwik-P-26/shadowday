# Devpost submission: Shadowday

Copy each block into the matching Devpost field.

---

## Project name

Shadowday

## Elevator pitch (Devpost "tagline", max 200 characters)

A free first day at a tech job for UAE students, wherever they live: AI coworkers, a hidden requirement, real Python and real tests in the browser. English and Arabic, phone and laptop.

## Short description (max 300 words)

> Shadowday is a free, browser-based first day at a tech job for UAE secondary students, wherever they live.
>
> Since 2025, every UAE public school teaches AI. But 99% of UAE tech funding in January–September 2026 went to companies in Dubai and Abu Dhabi, and research on inventors finds that childhood exposure to innovation shapes who becomes one. A student in Liwa, Dibba or Kalba learns AI in class but never sees an engineer's day. Shadowday lets them live one.
>
> You pick your area (14, across all seven emirates) and join a fictional startup working on a problem near you: groundwater on Liwa's date farms, wadi flash floods on the east coast, or heat safety for outdoor workers. Mariam, your manager, runs the standup and hands you a ticket: three small Python functions with real unit tests that run in your browser. One function depends on a rule nobody wrote down, so the tests fail until you ask the customer. Ravi, the senior engineer, answers with questions and never writes your code. You open a pull request, Ravi reviews your actual diff, you demo your code on a full dataset, and you leave with a Shadow Report and a project you can download.
>
> Python runs in a Web Worker through Pyodide, so grading is done by real tests, not by an AI's opinion. The coworkers run on the free Groq and Gemini tiers with automatic failover and a complete scripted fallback, so it costs $0 and still works with no keys. A server-side guardrail rejects any mentor reply that contains code. It works in English and Arabic (full right-to-left), on phones and laptops, with no account.
>
> A new region is one data file. The gap exists everywhere; I started with the UAE because it's home.

(294 words. Check the count in Devpost's field before submitting.)

---

## About the project (the "story" field, Markdown)

### Inspiration

The hackathon's line is *"Innovation shouldn't depend on location."* In the UAE, the classroom part of that is already happening: since the 2025–26 school year, AI is a required subject in every public school, from kindergarten to Grade 12. The *exposure* part isn't. In the first nine months of 2026, 99% of UAE tech funding went to companies in Dubai (69%) and Abu Dhabi (30%). A student in Liwa is more than 160 km from the nearest startup hub.

That matters because exposure is what turns knowledge into a career. *Who Becomes an Inventor in America?* (Bell, Chetty, Jaravel, Petkova and Van Reenen, QJE 2019) found that children who grow up around inventors are far more likely to become inventors themselves. Work shadowing is the classic fix, but it needs an office nearby. So I built the office.

### What it does

Shadowday is a full first day at a (fictional) tech startup, in the browser:

1. **Pick your area.** There are 14 areas across all seven emirates, and each maps to a real local problem:
   - Liwa, Madinat Zayed and Al Ain: date-farm groundwater (Falaj Labs).
   - Fujairah, Dibba, Khor Fakkan, Kalba, Hatta and Ras Al Khaimah: wadi flash floods (WadiWatch).
   - Ruwais, Musaffah, Sharjah, Ajman and Umm Al Quwain: outdoor-worker heat safety (Barid Labs).
2. **Standup.** Mariam, the engineering manager, introduces the team and hands you a ticket.
3. **Build.** The ticket is three short Python functions, with unit tests that run in the browser. The third function depends on a business rule the ticket never states. The failing tests tell you to ask the customer: Saeed the date farmer, Khalid the roads coordinator, or Fatima the site safety lead. Ask the right question and they explain the rule, the way a real customer would.
4. **Get unstuck.** Ravi, the senior engineer, answers questions with questions and gives hints in steps. Ask him for the code and he won't give it.
5. **Pull request.** Ravi reviews your actual diff, comments on it and approves it. You can only open the PR once the tests pass on the code you're submitting.
6. **Demo.** Your merged code runs on a full dataset, and the results are charted for Mariam: the over-pumped days, the roads to close, or the unsafe work hours.
7. **Shadow Report.** It covers what you shipped, the engineering habits you showed (asking the customer, testing, taking review), Mariam's note, free next steps (CS50P, Kaggle Learn, Elements of AI, freeCodeCamp), and a .zip of your project with a README and a test runner.

It works in English and Arabic, with a full right-to-left layout and code kept left-to-right. It runs on phones (with a symbol key bar for typing Python) and on laptops (a three-pane IDE layout). There's no account, and progress is saved only on your device.

### How I built it

- **Next.js 16 + React 19 + TypeScript + Tailwind v4.** One app with a Zustand store that is persisted to localStorage. CodeMirror 6 handles the editor.
- **Python in the browser.** Pyodide runs in a module Web Worker, served from the app's own origin. A small harness runs the unit tests and the demo and returns structured results. If a run takes longer than 10 seconds, the worker is terminated and restarted, so infinite loops can't freeze the page.
- **Three AI coworkers for $0.** `POST /api/agent` builds a role prompt for each coworker. It tries Groq's free tier (`gpt-oss-120b`), then Gemini's free tier (Flash-Lite), then a scripted fallback written for every coworker, mode and language. With no API keys at all, the whole day still works.
- **The hidden requirement.** Only the customer's prompt contains the rule. Unit tests check that the manager's and mentor's prompts never leak it. When a reply reveals the rule, the moment is recorded for the report.
- **No-solution guardrail.** A mentor reply that contains code is rejected on the server and retried once. If it fails again, the hand-written hint for that step is served instead.
- **Tickets that prove themselves.** A checker script runs every ticket's reference solution (it must pass), its starter code (it must fail) and a "didn't ask the customer" solution (it must fail exactly on the hidden-rule tests).
- **Testing.** Vitest unit tests cover failover, guardrails, prompts, reveal detection, scripted replies and the API route. Playwright runs the whole day end to end on desktop Chrome, a Pixel 7 and an iPhone 15 (WebKit), in English and Arabic.
- **Built with AI assistance.** I built this solo, with Claude Code as my coding assistant.

### Challenges I ran into

- **Designing a hidden requirement that teaches instead of frustrates.** The failing test has to say "ask the customer" without giving the rule away. The customer has to reveal the rule to natural questions, like "what counts as too much?" or «متى يجب أن نغلق الطريق؟», but not to small talk. That took many rounds of phrasing tests in both languages.
- **Free tiers are unreliable by design.** Rate limits, model changes and outages are normal. The fix was layered failover plus a scripted fallback good enough that the day never breaks.
- **Arabic done properly.** That meant right-to-left layout with left-to-right code islands, bidirectional text in test messages and data, Arabic plural forms, and gender agreement for each character.
- **Phones.** This needed a 16px editor so iOS doesn't zoom, the on-screen keyboard covering the run bar (handled with the visualViewport API), and a symbol bar for `( ) [ ] : =`.
- **Honest grading.** A student could edit their code after a green run and open a PR anyway. Now the PR and the review only accept a test run on the exact code being submitted.

### Accomplishments I'm proud of

- The whole day works with zero API keys and zero cost, and gets better when free keys are added.
- Grading is deterministic. The AI talks about the code; the tests decide.
- A full Arabic experience, not just a translated menu.
- 200+ unit tests, a ticket-integrity checker, and end-to-end tests on three devices.

### What I learned

The hardest part of a junior developer's first day isn't the code. It's knowing that you're *allowed* to ask, and what to ask. Building a customer who only explains the rule when asked made that the centre of the experience.

### What's next for Shadowday

- **More region packs.** The engine is region-agnostic, so a new region is one data file. Next would be other places far from tech hubs, inside and outside the UAE.
- **More tickets per company**, from a first bug fix to a small feature, so a student can come back for day two.
- **Teacher mode**, so a class can run the day together and compare Shadow Reports, still without student accounts.
- **Real tickets** written with UAE startups, so students shadow work that real teams have done.

---

## Built with (Devpost tags)

next.js, react, typescript, tailwindcss, python, pyodide, webassembly, web-workers, codemirror, zustand, groq, gemini, vercel, vitest, playwright

## Links ("Try it out")

- Live app: `<Vercel URL>`
- Source: https://github.com/Rithwik-P-26/shadowday
- Demo video: `<YouTube URL>`

## Sources for every statistic

- AI subject in every UAE public school, KG to Grade 12, from 2025–26: WAM, [Ministry of Education introduces AI curriculum in public schools](https://www.wam.ae/en/article/bji6z2n-ministry-education-introduces-curriculum-public) (May 2025).
- 99% of UAE tech funding in 9M 2026 to Dubai (69%) and Abu Dhabi (30%): Tracxn, *UAE Tech 9M 2026* report, via [Zawya](https://www.zawya.com/en/press-release/companies-news/moove-cargo-x-and-tabby-raise-733mln-combined-accounting-for-49-of-uae-techs-1.5bln-in-9m-2026-1857288).
- Childhood exposure and invention: Bell, Chetty, Jaravel, Petkova and Van Reenen, "Who Becomes an Inventor in America? The Importance of Exposure to Innovation," *Quarterly Journal of Economics* 134(2), 2019.
- Liwa is about 160 km from Hub71 in a straight line, computed in the app (`kmToNearestHub` in `content/regions.ts`).

---

## YouTube upload

- **File:** `demo/shadowday-demo.mp4` (2:23, 1080p). Captions are burned in; `demo/shadowday-demo.srt` can also be added as subtitles.
- **Thumbnail:** `demo/thumbnail.jpg` (custom thumbnails need a verified YouTube account; skip it if YouTube asks for verification).
- **Visibility:** Public or Unlisted (both work for Devpost).
- **Title:** Shadowday: a first day at a tech job, from anywhere in the UAE (Bridge The Gap Hacks 2026)
- **Description:**

> Shadowday is a free browser simulation of a first day at a tech job for UAE secondary students. Pick your area, join a (fictional) startup working on a problem near you, ask the customer for the rule nobody wrote down, write real Python against real tests in the browser, get your pull request reviewed, demo it, and leave with a Shadow Report. English and Arabic, phone and laptop, no account, $0 to run.
>
> Built solo for Bridge The Gap Hacks 2026.
> Live app: <Vercel URL>
> Code: https://github.com/Rithwik-P-26/shadowday
>
> Sources: WAM (AI curriculum in UAE public schools, 2025); Tracxn UAE Tech 9M 2026 report; Bell, Chetty, Jaravel, Petkova and Van Reenen, QJE 2019.

## Screenshots for the Devpost gallery

Upload these from `docs/screenshots/`, in this order:
1. `04-customer-reveals-the-rule.jpg`
2. `03-tests-say-ask-the-customer.jpg`
3. `05-mentor-refuses-to-give-code.jpg`
4. `07-pull-request-review.jpg`
5. `08-demo-for-the-manager.jpg`
6. `09-shadow-report.jpg`
7. `10-phone-arabic.jpg`
8. `11-architecture.jpg`
9. `01-pick-your-area.jpg`
