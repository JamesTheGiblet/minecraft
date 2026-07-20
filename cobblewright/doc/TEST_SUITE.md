# CobbleWright Test Suite Guide

This document describes how the CobbleWright Jest suite is organized, how to run it, and what to do when tests fail.

## Current Baseline

- Test runner: **Jest**
- Current suites: **8**
- Current tests: **112**
- Command: `npm test`

## Run Commands

From the CobbleWright project folder:

```powershell
npm test
```

Run with open-handle diagnostics when a worker does not exit cleanly:

```powershell
npm test -- --detectOpenHandles
```

Run a single test file:

```powershell
npx jest tests/utils/sc-capsules.test.js
```

Run a single test by name:

```powershell
npx jest -t "should parse a valid JSON response and say the advice"
```

## Test Layout

Test files live under `tests/plugins/` and `tests/utils/`:

- `brain.test.js`: prompt/response parsing and graceful failure behavior
- `commands.test.js`: command registration and natural-language intent routing
- `leighton-loop.test.js`: critique scoring and telemetry-based learning outcomes
- `object-helpers.test.js`: utility path read behavior
- `project-manager.test.js`: project command flows and persistence behavior with mocked pg
- `sc-capsules.test.js`: capsule loading, merge behavior, diagnostics, and normalization rules
- `survival.test.js`: home management and gohome behavior
- `weather-manager.test.js`: weather command behavior and telemetry hooks

## Stability Notes

- Some tests intentionally exercise failure paths and may print expected `console.error` output.
- Repeated `RUNS ...` lines in Jest output are normal while parallel workers execute.
- The `brain` plugin interval uses timer lifecycle cleanup (`unref` plus clear on bot end) to avoid open-handle leaks.

## Writing New Tests

When adding tests:

- Prefer deterministic unit tests with explicit mocks over live service calls.
- Keep each test focused on one behavior or contract.
- Cover both success and failure paths.
- Match existing naming style: `should ...` descriptions.
- If a behavior change is intentional, update related tests and this doc's baseline counts.

## Fast Failure Checklist

If a test fails:

1. Confirm you are in the `cobblewright` folder.
2. Re-run only the failing file with `npx jest <file>`.
3. If the failure involves timers/workers, run with `--detectOpenHandles`.
4. Verify mock setup/teardown in `beforeEach` and `afterEach`.
5. Fix behavior or test expectation, then run full suite again with `npm test`.

## Done Criteria

A testing change is complete when:

- `npm test` passes.
- `npm test -- --detectOpenHandles` does not report unexpected leaks.
- Documentation references in this file remain accurate.
