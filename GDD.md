# Game Design Document (GDD)

> Derived strictly from GAME_BRIEF.md. Nothing here adds features beyond the
> brief. Anything the brief did not fix is marked **[UNSPECIFIED — needs human
> decision]** rather than invented.

## 1. Overview
A side-on (Shadow Fight–style) brawler set in a dark gothic undead world. The
player controls a single character who advances through continuous waves of
enemies, defeating them with punches. The character has a level that rises as it
hits more enemies; that level drives how many enemies appear and how difficult
they are, and scrolls the player through progressively darker zones. Enemies are
skeletons (three variants) and zombies (two variants), with a harassing bat
enemy and a one-eyed-ogre boss appearing from time to time.

## 2. Controls
- **Move:** on-screen joystick.
- **Straight punch:** normal forward punch.
- **Uppercut:** upward punch.
- **Punch direction:** resolved the same way as in *Shadow Fight* (direction
  determined by the input/aim, not fixed left-right only).
- **[UNSPECIFIED — needs human decision]** On-screen button layout for the two
  punches (separate buttons, gesture, etc.).

## 3. Mechanics
- **Combat:** the character clears waves by punching enemies. Two attacks are
  available — straight punch and uppercut.
- **Leveling:** hitting enemies increases the character's level. ("The more
  enemies he hits, the more level increases.")
- **Difficulty scaling:** the character's level determines enemy count and
  difficulty. As level rises, the swarm (enemy count) grows AND individual
  enemies become harder to defeat — even types that were easy at low levels are
  difficult at high levels.
- **Player health:** the character has 5 health.
- **Enemy strength tiers:** the stronger enemy variants (sword-and-shield
  skeleton; blast zombie) have more health and deal more damage than the basic
  variants.
- **Blast damage:** a defeated blast zombie detonates after 1–2 seconds; the
  character takes damage if nearby at detonation.
- **[UNSPECIFIED — needs human decision]** Exact numbers: hits-per-level,
  level→wave-size/difficulty curve, per-enemy health/damage, blast radius and
  blast damage. (Player health is fixed at 5.)

## 4. Drone Behavior (Bat enemy)
The "drone"-type entity in this game is a **bat**.
- **Spawn:** appears at random during normal (non-boss) play.
- **Purpose:** deals small damage to the character over time (chip damage).
- **Persistence:** does not leave the character alone until defeated; it follows
  the character from a distance.
- **Attack:** while the character is fighting non-ogre enemies, bats randomly
  swoop in to attack.
- **Defeat (uppercut only):**
  1. a perfectly timed uppercut as the bat swoops in, or
  2. an uppercut thrown at another enemy that also catches the bat mid-swoop.
- **Boss fights:** bats are not active during the ogre fight (it is isolated —
  ogre only).
- **[UNSPECIFIED — needs human decision]** Bat spawn rate, damage-per-tick,
  follow distance, swoop frequency, uppercut timing window.

## 5. Enemy Behavior (as defined in the brief)
- **Skeleton — unarmed:** basic melee attacker, no weapon.
- **Skeleton — sword:** melee attacker with a sword.
- **Skeleton — sword and shield:** stronger variant; shield implied by name;
  more health and damage (per the "latter type" rule).
- **Zombie — normal:** basic zombie attacker.
- **Zombie — blast:** stronger variant; on defeat, detonates within 1–2
  seconds, damaging the character if nearby.
- **Boss — one-eyed ogre:** appears from time to time as a boss encounter.
  - Long-range attack: club and laser eyes.
  - Short-range attack: a randomized combination of three moves — ground-slam
    shockwave, grab & throw, and club sweep — selected unpredictably so the
    player cannot predict the next attack.
  - The boss fight is isolated — no other enemies (including bats) appear during
    it.
- **[UNSPECIFIED — needs human decision]** Non-boss enemy movement/attack
  patterns and attack ranges; how often the boss appears.

## 6. Map Layout
A horizontally scrolling, side-on world with a gothic undead theme that changes
as the character levels up — turning the "endless + rising difficulty" loop into
something the player can see.

- **Parallax layers:**
  - Far: moonlit sky, fog, clouds.
  - Mid: tombstones, dead trees, broken fences, ruined walls.
  - Near: the ground plane where the fight happens.
- **Zone progression (driven by level):** Graveyard → Catacombs / Crypt →
  Ruined Village → deeper ruins. Each successive zone is darker and more
  oppressive, so the environment telegraphs that the swarm is getting worse.
- **Boss arena:** when the ogre appears, the view cuts to a distinct, enclosed
  space (an ogre's lair / collapsed arena). The framing change itself signals
  the isolated 1v1 — no other enemies, no bats.

## 7. Win and Loss Conditions
- **Win:** none. The game is endless — the character keeps defeating enemies
  with no victory/completion state.
- **Loss:** the character starts with 5 health and loses when all 5 health is
  gone.

## 8. Visual Direction
- **Overall:** dark gothic undead aesthetic, matching the enemy roster
  (skeletons, zombies, bats, ogre).
- **Shadow Fight–style presentation:** characters and enemies rendered as crisp
  dark silhouettes in the foreground against a moody, lit backdrop. This keeps
  the three skeleton variants (unarmed / sword / sword+shield), the two zombie
  variants (normal / blast), and the bat readable even in a large swarm.
- **Mood escalates with level:** palette cools and darkens and fog thickens as
  the character progresses through the zones, reinforcing rising stakes.
- Clear silhouette distinction between the three skeleton variants and the two
  zombie variants, so the player can read threat level at a glance.
- Blast zombie needs a readable pre-detonation "about to blast" telegraph during
  the 1–2 second window.
- One-eyed ogre reads clearly as a boss; its enclosed lair framing sets it apart
  from normal waves.
- **[UNSPECIFIED — needs human decision]** Specific art style execution (2D
  hand-drawn vs. rendered), exact palette values, camera framing details.

## 9. Acceptance Criteria
- [ ] Character moves via on-screen joystick.
- [ ] Character can perform a straight punch and an uppercut.
- [ ] Punch direction behaves as in Shadow Fight.
- [ ] All three skeleton variants exist (unarmed, sword, sword+shield).
- [ ] Both zombie variants exist (normal, blast).
- [ ] Blast zombie detonates 1–2s after defeat and damages a nearby character.
- [ ] Stronger variants (sword+shield skeleton, blast zombie) have more health
      and deal more damage than their basic counterparts.
- [ ] One-eyed-ogre boss appears periodically.
- [ ] Ogre uses club + laser eyes at long range.
- [ ] Ogre's short-range attack randomly varies between ground-slam, grab, and
      club sweep so it is unpredictable.
- [ ] No other enemies (including bats) appear during the boss fight.
- [ ] Bat enemy appears randomly, follows the character, and chips health over
      time until defeated.
- [ ] Bat can only be defeated by an uppercut — a timed one as it swoops, or an
      uppercut on another enemy that also catches it.
- [ ] Hitting enemies raises the character's level.
- [ ] Enemy count grows and enemies get harder to defeat as level rises.
- [ ] World scrolls horizontally with parallax (far/mid/near layers) in a gothic
      undead theme.
- [ ] Zones progress with level (Graveyard → Catacombs/Crypt → Ruined Village →
      deeper ruins), getting darker/more oppressive.
- [ ] Boss fight cuts to a distinct enclosed ogre-lair arena.
- [ ] Character has 5 health; losing all 5 ends the run.
- [ ] Game is endless — there is no win state.

## 10. Proposed Starting Balance (tunable — baseline for the dev cycle)
> These are suggested starting values, approved by amartyajha as a baseline to
> tweak during development. They are NOT fixed brief requirements.

**Player**
- Health: 5 (fixed by brief).
- Straight punch: fast, short reach, 1 damage.
- Uppercut: slower, 2 damage, slightly more reach; also the only bat-killer.

**Enemy health** (in straight-punch hits; an uppercut counts as 2)
- Skeleton unarmed: 1 hit.
- Skeleton sword: 2 hits.
- Skeleton sword + shield: ~4 effective — shield blocks frontal straight
  punches, so it must be opened with an uppercut (or hit from behind).
- Zombie normal: 2 hits.
- Blast zombie: 3 hits (tougher), then 1–2s fuse before it detonates.
- Bat: dies to 1 uppercut only.
- Ogre: large bar, ~30 hits on first appearance, +~25% each later appearance.

**Damage to the player** (out of 5)
- Basic enemies (unarmed/sword skeleton, normal zombie): 1.
- Stronger variants (sword+shield skeleton): 2.
- Blast zombie: 1 on contact; 2 from the explosion (step clear within the fuse).
- Bat: 1 per successful swoop, but swoops are infrequent (slow bleed).
- Ogre: club 1, laser eyes 1; short-range ground-slam 2, grab 2, club sweep 1.
- Blast radius: ~1 character-width; uppercut-window to kill a bat: ~0.3–0.4s.

**Leveling**
- +1 level per ~8–10 enemies defeated.

**Difficulty scaling per level**
- Max concurrent enemies: start ~3–4, +1 every 2 levels, cap ~10–12.
- Enemy HP +~10% and damage +~5% per level, so early-easy types get tanky later.
- Spawn mix shifts up: early levels favor unarmed skeletons / normal zombies;
  higher levels add more sword+shield skeletons and blast zombies.

**Bat spawning**
- From ~level 2 onward: ~25–30% chance per wave, max 1–2 active at once.
- Never spawns during a boss fight.

**Boss cadence**
- Ogre appears every ~5 levels; HP scales up each appearance (see above).
