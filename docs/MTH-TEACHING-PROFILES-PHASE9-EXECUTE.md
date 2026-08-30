# Teaching Profiles Phase 9 — consolidation

**Generated:** 2026-08-30T08:49:03.006Z  
**Mode:** EXECUTE  
**Rows scanned:** 106

Paused non-survivors. Did **not** delete listing ids. Redirect table maps old `/listings/{id}` to the survivor.

## Counts

| Metric | Count |
|--------|------:|
| Teaching Profiles | 106 |
| Same-canonical groups | 9 |
| ACTIVE collision groups (before this run) | 7 |
| Groups written | 9 |
| Unique index safe | yes |
| Leftover CSV tutors (not exploded) | 0 |

## Survivor / redirect

| Canonical | Kept | Redirected (paused, 301) |
|---|---|---|
| Mathematics | `cmtdgosh30005hyhjjaq0a9ns` | `cmtdgoszf000bhyhj4ogze411` `cmtdgot50000dhyhjeevgb760` |
| Chemistry | `cmtdgozsd002fhyhjs987otve` | `cmtdgp0eo002nhyhjmns50c8e` |
| Chemistry | `cmtdgp24s0037hyhjn3jteek9` | `cmtdgp2oc003dhyhjr1elgao5` |
| Islamic Studies | `cmtdgowm8001fhyhjkedrge3g` | `cmtdgowrt001hhyhj46ohwq0w` |
| Islamic Studies | `cmtdgp75g004vhyhju5kwbgbm` | `cmtdgp7m6004zhyhjp8u11vm1` |
| Mathematics | `cmtdgotzl000lhyhjte0fhah0` | `cmtdgouaq000phyhj2i059nhe` |
| Mathematics | `cmtdgozbl0029hyhjtgoscb8g` | `cmtdgozms002dhyhj5hnunfyw` |
| Physics | `cmtdgp2d60039hyhjiisedpb4` | `cmtdgp329003hhyhj2tly8uj5` |
| Physics | `cmtdgp5b20049hyhjx57i7pst` | `cmtdgp6oq004phyhjao3ni5ep` |

Re-run dry-run:

```bash
npx tsx scripts/dry-run-teaching-profile-consolidation.ts
```
