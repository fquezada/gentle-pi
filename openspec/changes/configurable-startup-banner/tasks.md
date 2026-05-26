# Tasks: configurable-startup-banner

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 220-320 additions/deletions if UI stays `ctx.ui.select`-based |
| 400-line budget risk | Low-Medium |
| Chained PRs recommended | Existing stack already created |
| Suggested split | Preserve existing branch stack and keep each slice focused |
| Delivery strategy | chained-pr-existing |
| Chain strategy | issue-32-sdd-plan-a -> issue-32-sdd-plan-b -> issue-32-banner-controls -> issue-32-banner-render |

Decision needed before apply: No
Chained PRs recommended: Existing PRs already exist
400-line budget risk: Low-Medium

> Session review budget: 350 changed lines per PR. Preserve the current stack and remove rose/text-logo toggle scope from all branches.

## Non-goals

- Do not add rose visibility toggles.
- Do not add text-logo visibility toggles.
- Do not add custom RGB input or arbitrary palette editing.
- Do not add project-local banner configuration.
- Do not support user-provided banner art or replace `TEXT_LOGO` / `ROSE_LARGE_RAW`.
- Do not redesign the startup animation, runtime info panel, or Pi theme system.
- Do not build a custom visual panel unless explicitly approved; use a small `ctx.ui.select` flow.

## Implementation Tasks

### 1. RED: add focused config helper tests
- [x] Create `tests/banner-config.test.ts` using `node:test`, temp directories, and `process.env.GENTLE_PI_CONFIG_HOME` isolation.
- [x] Add failing assertions for `lib/banner-config.ts` covering:
  - missing `banner.json` returns defaults `{ colorPreset: "pink" }`;
  - `normalizeBannerConfig` falls back for invalid presets;
  - supported presets `pink`, `cyan`, `yellow`, `green` are accepted;
  - `writeBannerConfig` writes normalized JSON to `$GENTLE_PI_CONFIG_HOME/banner.json`;
  - `updateBannerConfig` merges color patches over the normalized current config;
  - legacy/unknown fields such as `showRose` and `showTextLogo` are ignored.
- [x] Run `node --experimental-strip-types --test tests/banner-config.test.ts` and confirm it fails only because `lib/banner-config.ts` does not exist yet.

### 2. GREEN: implement `lib/banner-config.ts`
- [x] Add `lib/banner-config.ts` with `BANNER_COLOR_PRESETS`, `BannerColorPreset`, `BannerConfig`, `DEFAULT_BANNER_CONFIG`, `bannerConfigPath`, `normalizeBannerConfig`, sync/async read/write/update helpers.
- [x] Resolve config path as `$GENTLE_PI_CONFIG_HOME/banner.json` or `~/.pi/gentle-ai/banner.json`.
- [x] Make read helpers fail-safe: missing file, invalid JSON, and unexpected fs errors return defaults without breaking startup.
- [x] Ensure write/update helpers create parent directories and persist normalized color config only.
- [x] Run `node --experimental-strip-types --test tests/banner-config.test.ts` until green.

### 3. RED: extend runtime harness expectations for commands
- [x] Update `tests/runtime-harness.mjs` `EXPECTED_COMMANDS` with:
  - `gentle:banner-color`, `gentle-ai:banner-color`.
- [x] Add failing harness checks that invoke command handlers from `commands` and verify `$GENTLE_PI_CONFIG_HOME/banner.json` changes for:
  - `gentle:banner-color` persists a non-default supported preset through mocked `ctx.ui.select`;
  - `gentle-ai:banner-color` uses the same direct color-selection behavior.
- [x] Run `pnpm run test:harness` and confirm failures identify missing command registration/behavior.

### 4. GREEN: register banner color commands in `extensions/gentle-ai.ts`
- [x] Import banner config helpers from `../lib/banner-config.ts`.
- [x] Add a small shared color selection handler; have `/gentle-ai:banner-color` call the same handler as `/gentle:banner-color`.
- [x] Notify users with the resulting state and note changes apply to future startup renders/sessions.
- [x] Keep command code compact; avoid a custom panel or duplicate alias logic.
- [x] Run `pnpm run test:harness` until new command tests pass.

### 5. TRIANGULATE: integrate config and palettes into `extensions/startup-banner.ts`
- [x] Import `readBannerConfig` and `BannerColorPreset` as needed.
- [x] Extract current pink RGB values into a minimal palette map and add `cyan`, `yellow`, and `green` presets without changing animation structure.
- [x] Read normalized config once in the startup render path and select `BANNER_PALETTES[bannerConfig.colorPreset]`.
- [x] Preserve default visuals when no config exists by keeping the `pink` palette identical to current RGB values.
- [x] Preserve rose/text-logo visibility and layout behavior exactly as before this feature.
- [x] Do not expand minimal mode behavior.

### 6. REFACTOR: keep diff small and boundaries clear
- [x] Remove duplicated command alias code in `extensions/gentle-ai.ts` by centralizing handler registration helpers if needed.
- [x] Keep `startup-banner.ts` changes local to palette selection; do not rename large ASCII constants.
- [x] Re-run config and harness tests after refactor.

### 7. Documentation
- [x] Update `README.md` command/configuration documentation with:
  - primary commands and `/gentle-ai:*` aliases;
  - default color `pink` and unchanged rose/text-logo behavior;
  - presets: `pink`, `cyan`, `yellow`, `green`;
  - global path `$GENTLE_PI_CONFIG_HOME/banner.json` or `~/.pi/gentle-ai/banner.json`;
  - changes apply to future renders/sessions;
  - no custom RGB, custom art, or decorative visibility toggles in this change.

### 8. Final validation
- [x] Run `pnpm test`.
- [x] Run `pnpm run test:harness` if not already included in the last full test run.
- [x] Optional targeted syntax/type smoke, if supported in the environment: `node --experimental-strip-types --check lib/banner-config.ts`, `node --experimental-strip-types --check extensions/gentle-ai.ts`, `node --experimental-strip-types --check extensions/startup-banner.ts`.
- [x] Manually inspect changed line count. If above 350 for any PR, stop before PR/review and request a delivery decision.
- [x] Record test evidence and any known pre-existing diagnostics in the apply/verify artifact.

## Rollback Boundaries

- Config helper rollback: remove `lib/banner-config.ts` and `tests/banner-config.test.ts`.
- Commands rollback: remove banner command imports/registrations from `extensions/gentle-ai.ts` and harness expectations.
- Renderer rollback: remove config/palette usage from `extensions/startup-banner.ts` and restore hardcoded default colors.
- Documentation rollback: remove README banner customization section; existing user `banner.json` files can be ignored safely.
