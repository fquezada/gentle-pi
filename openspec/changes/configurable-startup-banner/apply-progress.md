# Apply Progress: configurable-startup-banner

## Summary

Implemented issue #32 startup banner color customization using strict TDD, then narrowed the existing PR stack after maintainer feedback to remove rose/text-logo visibility toggles.

## Completed tasks

- Added focused banner config tests.
- Added `lib/banner-config.ts` with color defaults, preset validation, global path resolution, fail-safe read helpers, write helpers, and update helpers.
- Extended runtime harness command expectations and behavior checks for color-only banner commands.
- Registered `/gentle:banner-color` and the `/gentle-ai:banner-color` alias.
- Integrated global banner color config into startup banner rendering with preset palettes.
- Preserved existing rose/text-logo visibility and layout behavior.
- Updated README banner color command documentation.
- Updated task checkboxes in `tasks.md`.

## Files changed

- `lib/banner-config.ts`
- `tests/banner-config.test.ts`
- `tests/runtime-harness.mjs`
- `extensions/gentle-ai.ts`
- `extensions/startup-banner.ts`
- `README.md`
- `openspec/changes/configurable-startup-banner/tasks.md`
- `openspec/changes/configurable-startup-banner/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Change | Command | Result |
| --- | --- | --- | --- | --- |
| 1 | RED | Added `tests/banner-config.test.ts` before config helper existed. | `node --experimental-strip-types --test tests/banner-config.test.ts` | Failed with `ERR_MODULE_NOT_FOUND` for `lib/banner-config.ts`. |
| 1 | GREEN | Implemented `lib/banner-config.ts`. | `node --experimental-strip-types --test tests/banner-config.test.ts` | Passed 5/5. |
| 2 | RED | Extended runtime harness expected commands and command behavior tests. | `pnpm run test:harness` | Failed with missing command `gentle:banner-color`. |
| 2 | GREEN | Registered banner commands and aliases in `extensions/gentle-ai.ts`. | `pnpm run test:harness` | Passed. |
| 3 | TRIANGULATE | Integrated config into `extensions/startup-banner.ts` and added palettes. | `node --experimental-strip-types --check lib/banner-config.ts && node --experimental-strip-types --check extensions/gentle-ai.ts && node --experimental-strip-types --check extensions/startup-banner.ts` | Passed. |
| 4 | REFACTOR | Reworked earlier broad formatter churn by restoring `extensions/startup-banner.ts` and reapplying compact edits; compressed new helper/tests to protect review budget. | `node --experimental-strip-types --test tests/banner-config.test.ts`; `pnpm run test:harness`; syntax checks | Passed focused tests and checks. |
| 5 | TRIANGULATE | Fixed palette usage so glint/logo colors use selected preset, not only rose/panel colors. | `node --experimental-strip-types --test tests/banner-config.test.ts`; `pnpm run test:harness`; syntax checks; `pnpm test` | Focused tests/checks passed; full suite initially exposed two portable-test issues outside banner scope. |
| 6 | GREEN | Fixed the two full-suite blockers: path separator assertion in OpenSpec guardrails test and non-portable fake Unix file URL in skill-registry duplicate-load test; narrowed duplicate-load state typing for testability. | `node --experimental-strip-types --test tests/openspec-guardrails.test.ts tests/skill-registry.test.ts`; `pnpm test` | Passed. |
| 7 | REFACTOR | Removed rose/text-logo toggle scope after maintainer feedback; retained color config and palette rendering only. | `node --experimental-strip-types --test tests/banner-config.test.ts`; `pnpm run test:harness` | Passed. |

## Test commands run

- `node --experimental-strip-types --test tests/banner-config.test.ts` — passed.
- `pnpm run test:harness` — failed during RED, then passed after implementation and after color-only scope reduction.
- `node --experimental-strip-types --check lib/banner-config.ts && node --experimental-strip-types --check extensions/gentle-ai.ts && node --experimental-strip-types --check extensions/startup-banner.ts` — passed.
- `pnpm test` — passed after fixing two portable-test blockers:
  - `tests/openspec-guardrails.test.ts`: changed path assertion to compare against `join(...)`.
  - `tests/skill-registry.test.ts` / `extensions/skill-registry.ts`: changed the test to use `pathToFileURL(...)` for a platform-native installed extension path and narrowed duplicate-load state typing for testability.

## Deviations from design

- Used compact direct color command registration instead of a general banner panel to stay aligned with the color-only scope.
- Kept render tests out of scope; coverage is via config helper tests, command behavior tests, and syntax checks for renderer integration.
- Maintainer feedback removed rose/text-logo visibility toggles from the final scope.

## Remaining tasks

- SDD verify should review the implementation against the color-only spec and confirm the updated delivery split before PR update.

## Workload / PR boundary

- Final delivery split requested by user: every review branch must stay under 400 changed lines.
  1. PR A `issue-32-sdd-plan-a`: explore/proposal/spec.
  2. PR B `issue-32-sdd-plan-b`: design/tasks plus portable test fixes.
  3. PR C `issue-32-banner-controls`: color config helper, commands, and command/config tests.
  4. PR D `issue-32-banner-render`: renderer palette integration, README, apply/verify evidence.

## Notes

- `context.md` was pre-existing untracked state and was not touched.
- Legacy `showRose`/`showTextLogo` fields in a manual config file are ignored by normalization and are not re-written.
