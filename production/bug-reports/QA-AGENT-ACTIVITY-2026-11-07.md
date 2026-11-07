# Switch QA Agent Activity Report

**Project:** Flip The Switch  
**Date:** 2026-11-07  
**Agent role:** Switch QA agent  
**Repository:** `amartya-jha-ipy/Flip_The_Switch`

## Summary

The QA agent supported the project by validating the live browser build, capturing
submission screenshots, reviewing the visual presentation against the supplied
character reference, reproducing a bat combat defect, verifying the fix, and
confirming the resulting changes were pushed to `main`.

## Activity Log

### 1. README and submission assets

- Reviewed the submitted README content and adapted it to the repository.
- Replaced the root README with structured game, architecture, controls, setup,
  milestone, QA and team documentation.
- Captured the running game in a local browser rather than using fabricated
  gameplay images.
- Added the requested submission images:
  - `docs/screenshots/main-gameplay.png`
  - `docs/screenshots/characters.png`
  - `docs/screenshots/boss-fight.png`
  - `docs/screenshots/hud-controls.png`
- Converted the supplied character reference image into `characters.png`.
- Verified README links and ran `git diff --check`.

### 2. Visual QA and presentation update

- Compared the supplied hand-painted gothic character reference with the live
  Canvas rendering.
- Confirmed that the project already used the matching character asset family:
  player, skeletons, zombies, bat and One-Eyed Ogre.
- Improved character presentation in `game/src/assets.js` by:
  - Increasing sprite scale.
  - Adding contact shadows.
  - Adding subtle dark outline/depth treatment.
  - Improving bat and Ogre visual presence.
- Reloaded the live build and recaptured the gameplay and boss screenshots.
- Confirmed JavaScript syntax with `node --check`.

### 3. Bat defect report and verification

**Observed behavior:** Bats could not reliably be killed with an uppercut during
their swoop.

**Reproduction:** The bat's collision box was only `36x16`, while its visible
sprite and uppercut timing envelope were substantially larger. Normal uppercut
timing therefore missed the bat even when the attack visually connected.

**Fix:** `game/src/enemies.js` now uses a `58x64` bat collision box while the bat
is in the `swoop` state. Bats remain immune to straight punches and remain
harder to hit while flying high.

**Retest:** Forced a bat into a swoop in the running browser build, performed an
uppercut, and confirmed the bat transitioned to its defeated state and was
removed from the active enemy list.

## Verification Evidence

| Check | Result |
| --- | --- |
| Local game loads in browser | PASS |
| Live gameplay screenshot captured | PASS |
| Live boss screenshot captured | PASS |
| README screenshot paths verified | PASS |
| JavaScript syntax check | PASS |
| Git whitespace check | PASS |
| Bat uppercut reproduction | PASS |
| Bat uppercut fix retest | PASS |
| Changes pushed to `main` | PASS |

## Commits

- `732d4f1` - Improve game visuals and documentation
- `db1bcfa` - Fix bat uppercut collision

## QA Status

The bat defect is fixed and verified in the live build. Full acceptance
checklist sign-off remains a separate QA pass and should not be inferred from
this focused defect verification.
