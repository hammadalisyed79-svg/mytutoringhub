# MTH Final UX Polish

Date: 2026-09-14  
Scope: content-flow and hierarchy polish — **not** a visual redesign.

## Pages improved

| Page | Changes |
|------|---------|
| `/` | Reordered to Search → Benefits → How it works → Subjects (8) → Trust → Past Papers → Plan teaser → Become tutor → Markets → Student request (end) → Final CTA. Removed duplicate hero bookmarks / invite nudge / mid-page request. |
| `/pricing` | Shorter hero; cards first; lean trust bar |
| `/how-it-works` | Process-only (Search/Contact/Learn + tutor steps); pricing deferred to `/pricing` |
| `/become-a-tutor` | Conversion landing: 3 benefits → steps → Free vs Pro → Start teaching |
| `/about` | Focused what/why/trust + CTAs; detailed pricing removed |
| `/help` | Categorized accordions (Account, Finding, Teaching, Plans, Papers, Safety) |
| `/search` | Short lead; no ValuePropStrip above results; request fallback at bottom |
| `/ads` | Short role-aware lead; less marketing copy |
| `/listings/[id]` | Contact moved above About; single sidebar CTA; compact similar copy |
| Past Papers home block | One primary CTA (Browse Past Papers) |

## Duplicate content removed

- Repeated “Find a tutor” / “Become a tutor” CTAs on homepage mid-sections
- Student Requests competing with search near top of homepage
- Long VALUE_PROPOSITION on how-it-works / search / ads boards
- Dual Message / Ask-about-availability CTAs on Teaching Profile
- Past Papers “Find an exam tutor” secondary on homepage section
- Pricing hero bullet list + checkout steps before cards

## Flow changes

- Discovery journey: Search first → Request as fallback at end (home + search)
- Teaching Profile: subject → Contact → About → Reviews → Similar
- Help: topic navigation instead of one FAQ wall

## Purchase-flow improvements

- Preserved prior zero-friction work (contextual upgrade, returnUrl, guest `next`)
- Listing guest join keeps `next` to the same Teaching Profile

## Mobile / bugs

- Typecheck clean
- Help TOC wraps; plan teaser uses compact buttons
- No new horizontal-layout changes beyond existing stacks

## Remaining genuine blockers

- None for this UX polish scope
- Legal entity / consent backlog still human (unchanged)

---

**Verdict:** Public journeys are shorter and clearer while keeping brand, layout system, and commercial model intact.
