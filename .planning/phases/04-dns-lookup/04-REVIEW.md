---
phase: 04-dns-lookup
reviewed: 2026-07-24T16:54:03Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - app/privacy/page.tsx
  - app/sitemap.test.ts
  - app/tools/dns/DnsTool.test.tsx
  - app/tools/dns/DnsTool.tsx
  - app/tools/dns/DnsToolLoader.tsx
  - app/tools/dns/faq-data.ts
  - app/tools/dns/page.tsx
  - lib/dns/parse.test.ts
  - lib/dns/parse.ts
  - lib/dns/query.test.ts
  - lib/dns/query.ts
  - lib/dns/resolve.test.ts
  - lib/dns/resolve.ts
  - lib/dns/types.ts
  - lib/dns/validate.test.ts
  - lib/dns/validate.ts
  - lib/hooks/useKeyboardShortcut.test.ts
  - lib/hooks/useKeyboardShortcut.ts
  - tests/e2e/dns-lookup.spec.ts
  - tests/e2e/dns-seo.spec.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/navigation.spec.ts
  - tools/registry.test.ts
  - tools/registry.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-07-24T16:54:03Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the DNS Lookup vertical slice (validate/query/resolve/parse + client
island), the 5-state error matrix added in 04-02, the `useKeyboardShortcut`
Enter-key regression fix, and the SEO/FAQ/privacy additions from 04-03.

The primary→fallback DoH resolution logic (`lib/dns/resolve.ts`,
`lib/dns/query.ts`) is well-classified and its unit/E2E tests correctly cover
the "one in-flight request races another, started-first-but-resolves-later"
scenario via immediate (Enter-triggered) lookups. However, the
`requestSeqRef`/`AbortController` race-safety guarantee that the code and
tests advertise ("the final-typed domain's result always wins") only actually
engages when a *new* `runLookup` call is made. Two paths that update UI state
without calling `runLookup` — typing an invalid domain, and pasting/typing a
second valid domain while an earlier debounced lookup is still in flight —
never abort the earlier in-flight request or bump the sequence counter, so a
late-arriving stale response can silently overwrite a genuinely newer
`invalid-input` state (or an in-progress edit) with stale results. This is a
real, reproducible correctness bug in the tool's core race-safety contract
and is not covered by the current test suite (see CR-01).

The `useKeyboardShortcut.ts` narrowing (native button/role=button/role=radio/
anchor only) is correctly scoped: both other consumers (`UuidTool.tsx`,
`SubnetTool.tsx`) use plain text inputs for their Enter handler and Radix
`ToggleGroupItem`/buttons for everything else that self-activates on Enter,
so the fix does not regress either tool. No security issues (hardcoded
secrets, injection, unsafe `dangerouslySetInnerHTML`) were found — the one
`dangerouslySetInnerHTML` use (FAQ JSON-LD) is properly escaped.

## Critical Issues

### CR-01: Stale in-flight DNS lookup can silently overwrite a newer `invalid-input`/in-progress state

**File:** `app/tools/dns/DnsTool.tsx:422-507` (`runLookup`), `559-616` (`handleDomainChange` / `handleDomainPaste`)

**Issue:** The documented race-safety guarantee ("discards the response if a
newer request has since started" / DNS-04) is implemented entirely inside
`runLookup`: it aborts the *previous* `AbortController` and bumps
`requestSeqRef` only when a **new `runLookup` call actually begins**. But
`handleDomainChange`'s invalid branch (line ~562) and `handleDomainPaste`'s
invalid branch (line ~601) update `state.lookup` to `"invalid-input"` — and
merely `clearTimeout` the pending debounce timer — **without** aborting
`abortControllerRef.current` or incrementing `requestSeqRef.current`. The same
gap exists for a second *valid* edit made while an earlier debounced lookup's
network request is already in flight (before the new debounce timer fires):
`scheduleDebouncedLookup` only schedules a future `runLookup` call, it does
not cancel the currently-running one.

Concretely:
1. A lookup for domain A is in flight (e.g. the mount-time default lookup,
   or a debounce-triggered lookup for a domain the user has since edited).
2. The user types an invalid string (or a different valid domain) before
   that lookup resolves. `state.lookup` becomes `"invalid-input"` (or stays
   `"loading"` for the new value) — but `requestSeqRef.current` is unchanged
   and the old `AbortController` is never aborted.
3. The stale response for domain A arrives. In `runLookup`'s continuation,
   `seq !== requestSeqRef.current` is `false` (no new `runLookup` call ever
   bumped it), and `controller.signal.aborted` is `false` — so neither guard
   fires, and `setState` overwrites the `invalid-input` message (or the
   in-progress edit's loading state) with domain A's stale
   success/nxdomain/empty-noerror/error card.

End result: the domain input can display text the validator has already
rejected (`aria-invalid` silently reverts to `false`, the inline validation
note disappears) while the result panel shows a fully-rendered — but stale
and mismatched — record set. This directly violates D-04/D-07's "never
silently show a result that doesn't match the current input" intent and
QUAL-08's invalid-input contract. It is not covered by
`DnsTool.test.tsx`'s existing invalid-input test (which never leaves a
request in flight when the invalid edit happens) or by
`tests/e2e/dns-lookup.spec.ts`'s race test (which only races two *valid*,
immediately-triggered lookups against each other — a path where `runLookup`
IS re-invoked and the guard works correctly).

**Fix:** Abort the in-flight request and bump the sequence token on every
state transition that supersedes an in-flight lookup, not just when a new
`runLookup` call is made — e.g. factor a small `cancelInFlightLookup()`
helper and call it from the invalid branches of `handleDomainChange` and
`handleDomainPaste` too:

```ts
function cancelInFlightLookup() {
  abortControllerRef.current?.abort();
  requestSeqRef.current++; // orphan any in-flight runLookup's seq check
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
}

function handleDomainChange(value: string) {
  const valid = isValidDomainInput(value);

  if (!valid) {
    cancelInFlightLookup();
    setState((prev) => ({
      ...prev,
      rawDomain: value,
      lookup: {
        status: "invalid-input",
        message: INVALID_DOMAIN_MESSAGE,
        lastValidResult: lastValidResultFrom(prev.lookup),
      },
    }));
    return;
  }
  // ...
}
```

Apply the same `cancelInFlightLookup()` call in `handleDomainPaste`'s invalid
branch. This ensures any lookup started before the input became invalid (or
before the newest edit) can never win a race against the state it has since
been superseded by.

## Warnings

### WR-01: Multi-segment TXT records may leave stray embedded quotes in the displayed value

**File:** `lib/dns/parse.ts:30-35` (`normalizeValue`)

**Issue:** `normalizeValue` strips exactly one leading and one trailing
double-quote when the whole TXT `data` string starts and ends with `"`. Per
RFC 1035, a TXT RDATA can consist of multiple `<character-string>`s, and
DoH JSON `data` fields for such records commonly render each segment
individually quoted and space-joined (e.g. `"first-255-bytes" "rest"`) —
common for long SPF includes and DKIM public keys that exceed 255 bytes.
For such a value, `data.startsWith('"') && data.endsWith('"')` is `true`,
but `data.slice(1, -1)` only removes the outermost pair, leaving the
internal `" "` sequence intact in the displayed/copied value (e.g.
`first-255-bytes" "rest` — a value with embedded literal quote characters
that was never present in the "real" unwrapped TXT content). The current
comment/tests only exercise a single-segment TXT value.

**Fix:** Verify against a live multi-segment TXT record (e.g. a real DKIM
selector) and, if confirmed, join multiple quoted segments before
stripping, e.g.:

```ts
if (type === "TXT") {
  const segments = data.match(/"(?:[^"\\]|\\.)*"/g);
  if (segments) {
    return segments.map((s) => s.slice(1, -1)).join("");
  }
  return data;
}
```

### WR-02: Resolver JSON-parse failures bypass the documented error-classification contract

**File:** `lib/dns/resolve.ts:36-59` (`queryAndClassify`)

**Issue:** The module header comment states every caller "only ever has to
handle the two typed error classes [`RateLimitError`/`ResolverFailureError`],
never a raw unclassified exception" (except for a re-thrown abort). The
`try/catch` around `queryResolver` only wraps the fetch call itself
(lines 42-48); `response.json()` on line 53 is unguarded. If a resolver
returns a 2xx response with a malformed/non-JSON body (e.g. an
intermittent CDN error page or truncated response), `response.json()`
throws a raw `SyntaxError` that is never wrapped into `ResolverFailureError`
and propagates to `resolveWithFallback`'s catch (line 76), then to any
external caller. `DnsTool.tsx`'s `classifyError` happens to default
unrecognized errors to `"resolver-unavailable"`, so the UI degrades
gracefully today — but the contract this module documents (and that other
code may come to rely on, e.g. logging `err.status` unconditionally) is
violated for this case.

**Fix:** Wrap the `.json()` call in the same try/catch (or a second one)
and re-throw as `ResolverFailureError`:

```ts
let body: DohResponse;
try {
  body = (await response.json()) as DohResponse;
} catch {
  throw new ResolverFailureError(response.status);
}
```

### WR-03: `DnsTool()` / `runLookup()` have grown into high-complexity functions

**File:** `app/tools/dns/DnsTool.tsx:396-801` (component), `422-507` (`runLookup`)

**Issue:** `runLookup` is ~85 lines with 4 nested nulls/early-returns and
3 separate `setState` branches; the `DnsTool` component itself is ~400
lines mixing state machine, debounce/abort orchestration, and rendering for
5 error states + loading + success. This is a maintainability risk — the
CR-01 bug above is a direct symptom of this orchestration logic being hard
to reason about in one place.

**Fix:** Consider extracting the lookup/debounce/abort orchestration into a
dedicated hook (e.g. `useDnsLookup()`) that owns `abortControllerRef`,
`requestSeqRef`, `debounceTimerRef`, and exposes `runLookupImmediate`/
`scheduleDebouncedLookup`/`cancelInFlightLookup` — this would make the
sequencing invariant enforceable in one place instead of three call sites.

## Info

### IN-01: Unreachable dead-code branch in `isValidDomainInput`

**File:** `lib/dns/validate.ts:34-35`

**Issue:** `const labels = trimmed.split(".")` on a non-empty string always
returns an array of length ≥ 1 (even `"".split(".")` returns `[""]`, and
`trimmed` is already guaranteed non-empty by the preceding `!trimmed` guard
on line 32). The subsequent `if (labels.length < 1) return false;` can
never evaluate to `true`.

**Fix:** Remove the dead branch:

```ts
const labels = trimmed.split(".");
return labels.every((label) => label.length <= 63 && LABEL_RE.test(label));
```

### IN-02: Worked-example TTL/value will silently drift from reality over time

**File:** `app/tools/dns/faq-data.ts:75-80` (`sampleFields`)

**Issue:** `sampleFields.value`/`.ttl` are hardcoded from a single live
capture (dated in the file header comment). Cloudflare's edge IPs and TTLs
for `cloudflare.com` can change; nothing re-verifies this worked example
against reality, so the page can end up displaying a value/TTL pair that no
longer corresponds to what a live lookup of the same domain/type actually
returns (undermining the "worked example" framing, though not a functional
bug).

**Fix:** Not urgent for v1 given it's explicitly documented as illustrative,
but consider a periodic (e.g. quarterly) manual re-verification, or a build-time
check that fails CI if a live check diverges materially (optional).

---

_Reviewed: 2026-07-24T16:54:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
