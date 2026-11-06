# GAME_BRIEF.md

> Source: concept described by amartyajha in the GameForge room (pending team
> confirmation). This file records ONLY the fixed requirements stated there.
> No features have been added. Open questions are listed at the end and must be
> resolved by a human before they become requirements.

## Concept
A side-on brawler in which the character advances through continuous waves of
enemies by punching through them.

## Fixed requirements

### Progression
- The character moves through many enemies, wave after wave.
- Difficulty and the number of enemies depend on the character's level.
- The more enemies the character hits, the more the level increases.
- As the level rises, the swarm (number of enemies) increases.
- As the level rises, enemies become harder to defeat — even enemy types that
  were easy at lower levels become difficult at higher levels.

### Health, win and loss
- The character has **5 health**.
- There is **no win condition** — the character keeps defeating enemies
  endlessly.
- **Loss** occurs when the character loses all 5 health.

### Enemy types
- **Skeletons** — three variants:
  1. Unarmed (no weapon).
  2. Sword — wields a sword.
  3. Sword and shield — wields a sword and a shield.
- **Zombies** — two variants:
  1. Normal zombie.
  2. Blast zombie — detonates within 1–2 seconds after being defeated; if the
     character is near it when it blasts, the character takes damage.
- The "latter" enemy types (the stronger variants) have more health and deal
  more damage.
- **Boss:** a one-eyed ogre, encountered from time to time.
  - Long-range attack: a club **and** laser eyes.
  - Short-range attack: a **randomized mix** of three moves — ground-slam
    shockwave, grab & throw, and club sweep — chosen unpredictably so the player
    cannot anticipate which one is coming.
  - During the boss fight, **no other enemies** are involved — only the ogre
    (this includes the bat: bats are not active during the boss fight).

### Bat enemy
- A bat-type enemy that appears at random.
- Sole purpose: deal **small damage over time** to the character.
- Persistent: until defeated it will not leave the character alone — it follows
  the character from a distance.
- While the character is busy fighting enemies **other than the ogre**, bats
  randomly swoop in to attack the character.
- Defeat conditions (uppercut only):
  1. A perfectly timed uppercut as the bat swoops in to attack; or
  2. An uppercut aimed at another enemy that also lands on the bat while it is
     swooping in.

### Player actions
- Two punches:
  1. Normal straight punch.
  2. Uppercut.
- Movement via an on-screen joystick.
- Punch direction is decided the same way as in *Shadow Fight*.

## Open questions (NOT requirements until a human confirms)
- No "drone" entities exist in this game. (Confirmed by amartyajha — there is
  no drone concept; the GDD's "drone behavior" heading stays empty.)
- Exact numeric values still unspecified: enemy health/damage, blast radius and
  blast damage, how many hits raise a level, the swarm-size and
  difficulty curve per level, and how often the ogre boss appears.
