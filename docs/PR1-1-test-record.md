# Test record: PR1-1 role separation and NGO verification

Owner: Rahul Ray. Branch: `feat/pr1-1-ngo-verification`.
Trust source: **A, fixed list** (`public/trusted-ngos.json`).

## What PR1-1 changes

| Step | Change | Commit |
|---|---|---|
| 2 | One login button; the role comes from the logged-in WebID (NGO only if it is on the trusted list, otherwise refugee; refugee if the list cannot load) | `b5995fb` |
| 3 | `grantAccessToSelectedNGOs` refuses any WebID not on the list, before any Pod request; refuses every grant if the list cannot load; revoking is not limited | `d8cfce1` |
| 5 | Refugees pick NGOs from a dropdown of verified NGOs instead of typing any WebID; unverified entries are labelled "Not verified" and stay revocable | `38b3c96` |
| Fix | NGO list no longer wiped on login; every NGO that can read the record is listed; a failed grant undoes the record and access-log rules | `64f3d0c` |
| Tests | `tests/trustedNgos.test.ts` | `efa1933` |
| i18n | Tigrinya for the new texts (unverified) | `af94785` |

## Test accounts (solidcommunity.net)

| Account | WebID | Role in the tests |
|---|---|---|
| Refugee A | `https://ml-refugee-a.solidcommunity.net/profile/card#me` | Refugee: grants and revokes |
| NGO N | `https://ml-ngo-n.solidcommunity.net/profile/card#me` | The only NGO on the trusted list |
| Outsider B | `https://ml-outsider-b.solidcommunity.net/profile/card#me` | Logged in, never trusted (impostor) |

Credentials are kept outside the repository.

## 1. Automated tests

`tests/trustedNgos.test.ts`, run with vitest (added by PR1-2). Run on 19 Nov on a merge of this branch with `feat/pr1-2-shacl-validation`: **12/12 pass** (45/45 together with PR1-2's tests).

| Area | Checks |
|---|---|
| Role | NGO role only for listed WebIDs; exact WebID match; refugee for unlisted or no WebID |
| Fail closed | Missing (404) or malformed list throws |
| Grant check | Unlisted NGO refused with no Pod request; a mix of listed and unlisted refused as a whole; every grant refused if the list cannot load; a listed NGO gets read access |
| Rollback | After an inbox failure, record and access-log rules are both undone |
| Record access | Agents with read access are listed, without the owner; unreadable rules give an empty list |
| NGO list loading | 404 gives an empty list; other failures give `null` (never saved over) |

Check that the tests catch real faults: disabling the grant check, or dropping the access-log rollback, makes the matching 3 tests fail.

An earlier offline test (12 Nov, stubbed fetch, real list file) passed 17/17 for steps 2 and 3; the tests above replace it.

## 2. Browser test, 15 Nov

Branch `feat/consent-disclaimer` (all of PR1-1 up to `38b3c96`, plus the consent screen), local dev server, live solidcommunity.net.

| Account | Check | Result |
|---|---|---|
| — | Consent screen; Log in disabled until ticked; asked again after logout | Pass |
| Refugee A | Refugee screen, no NGO dashboard | Pass |
| Refugee A | Dropdown offers only verified NGOs (NGO N), no free-text WebID box | Pass |
| Refugee A | NGO N added and shown by name; dropdown then says "All verified NGOs are already in your list" | Pass |
| Refugee A | Grant to NGO N passes the trusted-NGO check | Pass |
| Refugee A | Grant completes on the Pod | Not possible on this branch: Refugee A's `public/emergency.ttl` returned 404 |
| NGO N | NGO dashboard | Pass |
| Outsider B | Refugee screen, no NGO dashboard | Pass |

Note: solidcommunity.net was down on 14 Nov (Cloudflare 502/503, also affecting the Netlify deployment), so browser testing waited until 15 Nov.

## 3. Test with PR0 merged, 15 Nov

Local, uncommitted merge with `fix/pr0-secure-storage` (records in `private/`). To test labels and refusals, the trusted list was changed temporarily (Outsider B added, then the list emptied) and restored afterwards.

### Found

| Finding | Detail |
|---|---|
| Bug A | After a grant failed at the inbox step (403, no inbox set up), the NGO kept read and write on the access log and read on all evidence photos; only the record rule was undone |
| Bug B | The refugee's NGO list was wiped on every login: the auto-save wrote the empty list before the saved one loaded |
| A + step 5 | An NGO with access that is not on the trusted list could not be re-added, so it could not be revoked from the app |

Leftover access from Bug A was removed by revoking Outsider B and checked in the access rules.

### Retest after the fix (`64f3d0c`)

| Check | Result |
|---|---|
| Refugee A's record in `private/`; anonymous request gets 401 (PR0-2) | Pass |
| Full grant to NGO N | Pass |
| NGO N reappears in the list from the record's access rules although the saved list was empty | Pass |
| Failed grant to Outsider B leaves no access on record, access log or evidence | Pass (evidence rollback is part of PR0's grant) |
| NGO list survives a re-login | Pass |
| "Not verified, but still has access…" and "Not verified: you can revoke…" labels shown | Pass |
| Grant to an unverified NGO refused, nothing granted | Pass |
| Empty trusted list: "No verified NGOs are available right now." | Pass |

## 4. Integration check, 19 Nov

Trial merge of `main` + `fix/pr0-secure-storage` + `feat/pr1-2-shacl-validation` + `feat/consent-disclaimer`: build passes, lint has no errors, PR1-2's tests pass after its record path was made independent of `public/`/`private/`.

## Not covered or known limits

- The "trusted list unavailable" path was only tested automatically, not in the browser.
- Tigrinya texts are unverified (marked `ti: unverified` in the code).
- After PR0-1, every NGO on the trusted list must run "Initialise NGO inbox" once before it can receive grants.
- If a re-grant to an NGO that already had access fails at the inbox step, its existing record and access-log rules are removed too.
- The trusted list is only as trustworthy as whoever can change the repository or the Netlify site; changing it needs a redeploy.
- All tests use mock accounts, not real refugees or NGOs.
