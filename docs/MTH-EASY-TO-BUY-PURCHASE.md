# Easy-to-buy / zero-friction purchase

Date: 2026-09-14

## Principle

Sell the solution at the moment of need. Return the user to the same workflow after payment. Do not force Pricing-page detours for clear intents.

## Shipped

- `returnUrl` + `trigger` through SubscribeButton → Safepay checkout notes → complete → receipt continue CTA
- Contextual upgrade panel (Pass / Pro / Tutor Pro) on contact limit, request post, AI assistant
- Listing Boost returns to the same Teaching Profile; Priority Review buyable from profile improve
- Teaching Profile capacity: inline Activate Tutor Pro
- Past papers: buy this paper | Pass | Pro choices
- Guest join preserves `next` toward selected plan/checkout
- Duplicate active-plan checkout blocked (409) for Pass / Pro / Tutor Pro / Priority Review
- Analytics: `purchase_intent`, `upgrade_prompt_view`, `checkout_redirected`, `product_view`
- Trust line: “Secure checkout with Safepay”

## Tests

- `src/lib/purchase-context.test.ts`
- commercial + analytics + safepay suites

## Not in scope (kept)

- No popups / fake urgency
- Pricing remains full comparison
- Free options remain visible (Maybe later / free study tools)
