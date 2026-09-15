# Currency display audit (2026-09-14)

## Rule
Visitor-facing money uses `getVisitorCurrency()` + format helpers. Amounts stay PKR in DB. Admin surfaces may stay PKR.

## Fixed
- Plan/boost/verify CTA fallbacks no longer hardcode PKR (tutor/listing/ads/new/assistant/contact)
- Listing Boost button shows visitor-currency price
- Priority Verification copy converts with visitor currency
- Student request budget entered in visitor currency → stored as PKR
- Complimentary receipts use visitor currency zero amount
- Tutor-picks email rates use tutor-country currency (USD fallback)
- AI support quotes prices in visitor currency
- Past-papers SEO/analytics no longer force PKR
- Tutor plan/analytics prefer teaching-country currency
- Client defaults aligned to USD when currency prop omitted (not PKR)

## Unchanged (intentional)
- Admin plan/revenue screens in PKR
- Internal catalogue / enforcement remains PKR-based
- Optional `SAFEPAY_SANDBOX_FORCE_PKR=1` only if sandbox test cards fail on non-PKR

## Checkout / receipt
- Charge currency = visitor preferred currency (EUR, USD, …) in sandbox and production
- Receipt amount comes from stored `safepay_{CURRENCY}_{minor}` (what Safepay was charged)
