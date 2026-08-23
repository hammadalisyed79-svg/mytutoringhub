# Color Contrast + Readability Report

**Site:** mytutoringhub.com  
**Date:** 23 August 2026  
**Scope:** Public marketing site — WCAG 2.2 AA contrast + readability (not a redesign)

---

## BEFORE — contrast problems found

### Design tokens / global CSS

| Issue | Affected tokens / selectors | Impact |
|-------|----------------------------|--------|
| `.muted a` overrode `.btn` text color | `.muted a` (no `:not(.btn)` guard) | Primary buttons inside `.muted` paragraphs rendered link-green on green button background — **Help page “Chat with AI support”** |
| `.muted` on hero dark context | `.hero-path-footnote.muted` | “New here?” footnote used cream-page muted green (`#3d524c`) over photograph |
| Opacity stacking on hero text | `.hero p`, `.hero-path-*`, `.hero-kicker`, `.hero-sub`, `.hero .value-prop-strip` | Supporting hero copy compounded low contrast over variable photo luminance |
| Light hero overlay only | `.hero` single diagonal gradient | Bright regions of classroom photo showed through under path cards and footnote |
| FAQ answers used lighter muted | `.faq-item p { color: var(--muted-light) }` | Secondary FAQ copy borderline on white cards |
| Form hints used lighter muted | `.field-hint { color: var(--muted-light) }` | Helper text slightly faint on cream/white |
| Placeholder borderline | `::placeholder { #6b7f78 }` | ~4.3:1 on white (below AA) |
| AI support panel subtitle | `.ai-support-panel-sub` (0.8rem, inherited only) | Support widget sub-label relied on parent `.muted` without explicit token |

### Homepage hero (priority)

- **“New here?”** — `.muted` applied dark green + `opacity: 0.85` on photo
- **“Join as a student” / “List your profile”** — links fought `.muted a` link-green; footnote opacity reduced effective contrast
- **Hero lead, sub, kicker, value strip** — opacity-based hierarchy instead of on-dark semantic colors
- **Path cards** — 10% glass fill insufficient local contrast on bright photo areas

### Help page

- **“Chat with AI support”** button label — `.muted a` forced `#075e52` text on green `.btn` background

### Unaffected (left unchanged)

- Footer cream palette — already passed AA
- Primary green buttons on cream pages
- Page layout, typography families, copy, pricing, SEO

---

## DESIGN TOKENS — old → new

| Token / value | Before | After | Reasoning |
|---------------|--------|-------|-----------|
| `--on-dark-muted` | *(none)* | `rgba(255, 252, 247, 0.94)` | Readable secondary text over hero overlay |
| `--on-dark-subtle` | *(none)* | `rgba(255, 252, 247, 0.88)` | Eyebrow / tertiary hero text |
| `--on-dark-link` | *(none)* | `#fff8f3` | Links on photography — distinct, high contrast |
| `--on-dark-link-hover` | *(none)* | `#ffffff` | Hover state on dark contexts |
| `--btn-on-dark-border` | `rgba(…, 0.58)` | `rgba(…, 0.68)` | Stronger outline buttons on hero |
| `--btn-on-dark-bg` | `rgba(…, 0.12)` | `rgba(…, 0.14)` | Slightly more visible ghost surfaces |
| `::placeholder` | `#6b7f78` | `#5f726b` | Passes 4.5:1 on white |
| `.faq-item p` | `--muted-light` | `--muted` | Darker semantic muted on white cards |
| `.field-hint` | `--muted-light` | `--muted` | Form hints comfortably readable |
| Hero overlay | Single gradient | Bottom vignette + stronger diagonal gradient | Stabilises luminance behind cards/footnote without flattening photo |

**Preserved:** `--paper`, `--brand`, `--brand-deep`, `--accent`, `--ink`, footer colors, component shapes.

---

## HOMEPAGE HERO — exact fixes

1. **Layered overlay** — added bottom-up vignette (`rgba(6,24,20,0.74→0)`) plus stronger diagonal green gradient before photo.
2. **On-dark semantics** — `.hero .muted`, `.hero-lead`, `.hero-sub`, `.hero-kicker`, path card label/desc/footnote use `--on-dark-*` tokens instead of opacity + cream-page muted.
3. **Removed `muted` class** from `HeroPathCards` footnote — no longer inherits page-muted green.
4. **Path cards / search shell** — glass backgrounds `0.10→0.14`, borders `0.20→0.28` for steadier local contrast.
5. **Value prop strip** — `rgba(…,0.78)` → `var(--on-dark-muted)`.
6. **Scoped `.hero p`** — no longer applies generic paragraph sizing/margins to footnote; explicit `.hero-path-footnote` rules.

---

## BUTTONS / LINKS / FORMS — fixes

| Area | Fix |
|------|-----|
| **Links in `.muted`** | `.muted a:not(.btn):not(.btn-secondary):not(.btn-sm)` — buttons excluded from link-green rule |
| **Buttons in `.muted`** | `.muted .btn, .muted a.btn { color: var(--white) }` — explicit white label on primary buttons |
| **Hero links** | `.hero .muted a:not(.btn)…` uses `--on-dark-link` tokens |
| **Placeholders** | `#5f726b` globally |
| **FAQ answers** | `--muted` on white |
| **Field hints** | `--muted` on cream/white |
| **AI support panel sub** | Explicit `color: var(--muted)`, 0.82rem |
| **Hero secondary buttons** | Stronger `--btn-on-dark-*` borders (existing pattern, token bump) |

Disabled buttons unchanged — still subdued via `opacity: 0.65` but legible.

---

## AUTOMATED ACCESSIBILITY RESULTS

### Token contrast script (`node scripts/check-contrast-tokens.mjs`)

| Metric | Before (manual / estimated) | After |
|--------|----------------------------|-------|
| Failing token pairs | 1 (`placeholder on white` ~4.3:1) | **0** |
| Hero on-dark muted on overlay | N/A (wrong token used) | **10.47:1** |
| Hero on-dark link on overlay | N/A | **11.32:1** |
| Help btn in `.muted` | ~2.5:1 (green on green) | **7.90:1** (white on brand) |

No axe/pa11y dependency in project — did not install new stack. Photo regions require manual visual check (automated tools cannot score text over complex images reliably).

---

## VISUAL VERIFICATION

### Routes checked (post-deploy)

| Route | 375px | 390px | Desktop |
|-------|-------|-------|---------|
| `/` (hero) | ✓ | ✓ | ✓ |
| `/search` | ✓ | ✓ | ✓ |
| `/subjects` | ✓ | — | ✓ |
| `/past-papers` | ✓ | — | ✓ |
| `/pricing` | ✓ | — | ✓ |
| `/how-it-works` | — | ✓ | ✓ |
| `/become-a-tutor` | ✓ | — | ✓ |
| `/help` | ✓ | ✓ | ✓ |
| `/about` | — | — | ✓ |
| `/contact` | — | — | ✓ |
| `/free-vs-paid` | — | — | ✓ |
| `/login` | ✓ | — | ✓ |
| `/register` | — | — | ✓ |
| `/tutors/[id]` | — | — | ✓ |
| 404 | ✓ | — | ✓ |

### Production confirmations

- “New here?” — clearly readable
- “Join as a student” / “List your profile” — clearly readable white links with underline
- Hero supporting copy — readable over full photo width
- Help “Chat with AI support” — white label on green button
- AI Support launcher “Help” / “Support” — unchanged green gradient, white text (already passed)
- No harsh black/white regression; premium cream/green identity preserved

---

## FILES CHANGED

| File | Change |
|------|--------|
| `src/app/globals.css` | On-dark tokens, hero overlay, link/button guards, muted/form/FAQ contrast |
| `src/components/HeroPathCards.tsx` | Removed erroneous `muted` class from footnote |
| `scripts/check-contrast-tokens.mjs` | Token-level WCAG contrast audit script |
| `docs/chatgpt-color-contrast-readability-report.md` | This report |

---

## TEST RESULTS

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `npm run test:past-papers` | Pass |
| `npm run test:safepay` | Pass |
| `node scripts/check-contrast-tokens.mjs` | Pass (0 failures) |

---

## PRODUCTION STATUS

Deployed to **mytutoringhub.com** via push to `main`. Visual verification completed on live production pages listed above.

**Sprint complete.** No further development started.
