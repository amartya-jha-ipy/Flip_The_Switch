# Changelog — Flip The Switch

## [Visual Overhaul] — 2026-11-07

### Added
- **Hand-Painted Comic-Book Asset Engine (`src/assets.js`)**:
  - Zero-dependency, offline-ready sprite and visual rendering pipeline.
  - Pre-renders and manages 21 hand-painted comic-book art assets across `game/assets/characters/`, `game/assets/backgrounds/`, and `game/assets/ui/`.
- **Character Sprites**:
  - **Player**: Muscular brawler with oversized studded boxing gloves, expressive anime/comic fighter face, flowing red scarf, and animated walk, straight jab, rising uppercut, hurt, and downed states.
  - **Unarmed Skeleton**: Thin clattering bones, loose hanging jaw, hollow eye sockets with glowing yellow pinpricks.
  - **Sword Skeleton**: Cracked skull, red bandana, spiked pauldron, jagged rusty notched broadsword.
  - **Sword & Shield Skeleton**: Heavy kettle helm with bone horns, plate armor, and dented gothic kite shield that drops down when guard-broken by an uppercut.
  - **Normal Zombie**: Rotting olive-green decaying skin, mismatched bulging eyes, tattered purple rags, shambling walk.
  - **Blast Zombie**: Horrifically bloated grotesque silhouette with toxic glowing fissures and a pulsing chemical belly that triggers a demonic runic danger circle on defeat.
  - **Bat**: Large pointed ears, glowing crimson eyes, sharp vampire fangs, scalloped multi-frame flapping wings, and swooping attack dive.
  - **One-Eyed Ogre Boss**: Colossal hunched muscular beast matching target reference, horned skull mask, tiny squat legs, giant gnarled spiked club, single blazing demonic eye, firing a searing fiery laser beam, and crashing ground slam attacks.
- **Environment & Parallax Layers**:
  - **Sky**: Deep twilight indigo-to-purple gradient with moonlit cloud silhouettes.
  - **Moon**: Cratered silver-orange moon with soft atmospheric outer glow.
  - **Cathedral Spires**: Distant gothic ruins, towers, spires, and twisted dead-tree canopy.
  - **Midground Cemetery**: Gothic ruined stone arch, warm glowing iron lanterns with volumetric light halos, wrought-iron spiked fences, weathered Celtic crosses, and tombstones.
  - **Ground**: Hand-painted medieval cobblestone pavement with individual textured stone pavers, weeds, and moss.
  - **Boss Arena**: Enclosed subterranean gothic crypt with carved gargoyle pillars, stone masonry, and blazing iron wall braziers with flickering fire.
  - **Atmospheric Particles**: Ambient floating embers, mist motes, and fireflies drifting across the arena.
- **UI & Combat VFX**:
  - **Health Indicators**: Ornate gothic blood crystal hearts replacing flat red squares.
  - **Kill & Level HUD**: Stylized metallic badges and gothic typography.
  - **Combat VFX**: Luminous cyan crescent slash for straight punches and violet rising crescent arc for uppercuts.
  - **Virtual Controls**: Gothic metallic rune joystick with illuminated knob and ornate circular JAB / UP buttons with responsive press glows.
  - **Boss Bar**: Gothic dark gold and crimson framed health bar.
  - **Game Over Screen**: Styled typography with blood-red glow.

### Preserved (Zero Gameplay Regressions)
- Player movement, velocity, and baseline physics (`GROUND_Y`, `DEPTH_BAND`, speed 260px/s).
- Combat mechanics, directional aiming (Shadow Fight style), active hitbox windows, damage values (Straight 1, Uppercut 2).
- Enemy AI, standoff spacing, approach, windup, and attack timings.
- Shield skeleton frontal block and uppercut guard-break mechanics.
- Bat uppercut-only vulnerability and swoop chip-damage timing.
- Blast zombie fuse timer (1-2s), blast radius (62px), and detonation damage (2).
- Ogre boss long-range (club, laser eyes) and short-range (randomized slam, grab, sweep) attack pools.
- Wave manager, kill progression, level difficulty scaling, and endless mode loop.
