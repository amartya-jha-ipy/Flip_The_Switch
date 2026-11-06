# Acceptance Checklist — Flip The Switch

> Canonical QA reference, derived from GDD §9 (Acceptance Criteria) and mapped to
> the production task board (production/task-board.json). Each item lists the task
> that delivers it and its current verification status.
>
> Status legend: `[ ]` not yet verified · `[~]` dev-verified (in-room evidence), awaiting formal QA · `[x]` QA PASS.
>
> Current phase (2026-11-07): implementation focus. The qa agent is stood down
> per shashwat; the human testing lead runs the formal pass (~2026-11-08 AM).
> Interim DONE = developer in-room test evidence + producer commit verification.

## Controls & player (T1)
- [x] Character moves via on-screen joystick. _(T1 — QA PASS)_
- [x] Character can perform a straight punch and an uppercut. _(T1 — QA PASS)_
- [x] Punch direction behaves as in Shadow Fight (directional aim). _(T1 — QA PASS)_

## Health / win / loss (T2)
- [~] Character has 5 health; losing all 5 ends the run. _(T2 — dev-verified)_
- [~] Game is endless — there is no win state. _(T2 — dev-verified)_

## Enemies — skeletons (T4)
- [ ] All three skeleton variants exist (unarmed, sword, sword+shield). _(T4)_
- [ ] Sword+shield skeleton has more HP/damage; shield blocks frontal straight punches (open with uppercut). _(T4)_

## Enemies — zombies (T5)
- [ ] Both zombie variants exist (normal, blast). _(T5)_
- [ ] Blast zombie detonates 1–2s after defeat and damages a nearby character. _(T5)_
- [ ] Blast zombie shows a readable pre-detonation telegraph. _(T5/T10)_
- [ ] Stronger variants (sword+shield skeleton, blast zombie) deal more damage than basics. _(T4/T5)_

## Bat enemy (T6)
- [ ] Bat appears randomly, follows the character, chips health over time until defeated. _(T6)_
- [ ] Bat is killable ONLY by uppercut — a timed one as it swoops, or an uppercut on another enemy that also catches it. _(T6)_
- [ ] Bats do not appear during the boss fight. _(T6/T7)_

## Boss — one-eyed ogre (T7)
- [ ] Ogre boss appears periodically. _(T7)_
- [ ] Ogre uses club + laser eyes at long range. _(T7)_
- [ ] Ogre short-range attack randomly varies between ground-slam, grab, and club sweep (unpredictable). _(T7)_
- [ ] No other enemies (including bats) appear during the boss fight. _(T7)_

## Progression & scaling (T3, T8)
- [ ] Hitting enemies raises the character's level. _(T3)_
- [ ] Waves spawn; HUD shows level. _(T3)_
- [ ] Enemy count grows AND enemies get harder to defeat as level rises. _(T8)_

## World & visuals (T9, T10)
- [ ] World scrolls horizontally with parallax (far/mid/near) in a gothic undead theme. _(T9)_
- [ ] Zones progress with level (Graveyard → Catacombs/Crypt → Ruined Village → deeper ruins), getting darker. _(T9)_
- [ ] Boss fight cuts to a distinct enclosed ogre-lair arena. _(T9)_
- [ ] Shadow-Fight silhouette rendering keeps all variants readable in a swarm; HUD (health, level) present. _(T10)_

## Balance (T11)
- [ ] Difficulty curve feels fair per GDD §10 baseline (human/QA playtest sign-off). _(T11)_
