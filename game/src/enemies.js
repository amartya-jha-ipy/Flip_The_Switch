/*
 * Enemies (T3) — base enemy framework, wave spawner, and leveling.
 *
 * This milestone ships a single generic "grunt" enemy as the base. Variants
 * (skeletons T4, zombies T5, bat T6, ogre T7) extend this via per-type config
 * and the hooks below — nothing here is variant-specific except the config.
 *
 * Key hooks built for later milestones:
 *   - ENEMY_TYPES config table: add a variant by adding an entry.
 *   - enemy.blockCheck(hitbox): returns true if the hit is BLOCKED. Default
 *     never blocks; T4's sword+shield overrides this to block frontal straight
 *     punches (open with an uppercut). hitbox carries .type and .facing.
 *   - onKill callback drives leveling, decoupled from spawn logic.
 */
'use strict';

// Baseline tuning (GDD §10). All knobs, tunable in T11.
const KILLS_PER_LEVEL = 9;          // "~8-10 kills/level"
const BASE_MAX_CONCURRENT = 3;      // ground-enemy cap at level 1
const MAX_CONCURRENT_CAP = 12;      // hard cap on-screen (GDD ~10-12)
const BAT_MAX = 2;                  // max live bats at once
const BAT_SPAWN_CHANCE = 0.28;      // ~25-30% per spawn check, from ~level 2
// Per-level difficulty scaling (T8, GDD §10): enemies get tankier + hit harder.
const HP_PER_LEVEL = 0.10;          // +10% HP per level
const DMG_PER_LEVEL = 0.05;         // +5% damage per level

const ENEMY_TYPES = {
  // --- Skeletons (T4) ---------------------------------------------------
  // HP is in straight-punch units (uppercut = 2). GDD §10 baseline.
  skeleton_unarmed: {
    label: 'unarmed', hp: 1, dmg: 1, speed: 82, w: 28, h: 82,
    attackRange: 42, attackWindup: 0.40, attackCooldown: 1.0,
    color: '#15151b', stroke: '#9a9a86',
    weapon: 'none', hasShield: false,
  },
  skeleton_sword: {
    label: 'sword', hp: 2, dmg: 1, speed: 72, w: 30, h: 84,
    attackRange: 58, attackWindup: 0.50, attackCooldown: 1.1,
    color: '#16161c', stroke: '#b8a860',
    weapon: 'sword', hasShield: false,
  },
  skeleton_sword_shield: {
    // ~4 effective HP; shield blocks frontal straight punches — open with an
    // uppercut, which also drops the guard briefly so straights can follow.
    label: 'sword+shield', hp: 4, dmg: 2, speed: 60, w: 32, h: 86,
    attackRange: 52, attackWindup: 0.55, attackCooldown: 1.3,
    color: '#17171f', stroke: '#8aa0b4',
    weapon: 'sword', hasShield: true, guardOpenTime: 2.0,
  },

  // --- Zombies (T5) -----------------------------------------------------
  // Slower than skeletons. GDD §10 baseline.
  zombie_normal: {
    label: 'zombie', hp: 2, dmg: 1, speed: 52, w: 32, h: 80,
    attackRange: 44, attackWindup: 0.60, attackCooldown: 1.4,
    color: '#121a12', stroke: '#6a9a5a',
    family: 'zombie', weapon: 'none', hasShield: false,
  },
  zombie_blast: {
    // Tougher; on defeat it does NOT die immediately — it arms a 1-2s fuse,
    // then detonates, damaging the player if within the blast radius.
    label: 'blast zombie', hp: 3, dmg: 1, speed: 48, w: 34, h: 80,
    attackRange: 44, attackWindup: 0.60, attackCooldown: 1.4,
    color: '#1a1410', stroke: '#b87a3a',
    family: 'zombie', weapon: 'none', hasShield: false,
    blast: true, explosionDmg: 2, blastRadius: 62,
    fuseMin: 1.0, fuseMax: 2.0,
  },
};

// Level-scaled spawn mix (T8): early levels favor the easy types; higher
// levels shift weight toward sword+shield skeletons and blast zombies.
function spawnWeights(level) {
  const L = level - 1;
  return [
    ['skeleton_unarmed', Math.max(1, 4 - 0.30 * L)],
    ['skeleton_sword', 2 + 0.10 * L],
    ['skeleton_sword_shield', 0.5 + 0.25 * L],
    ['zombie_normal', 2],
    ['zombie_blast', 0.5 + 0.20 * L],
  ];
}

function pickSpawnType(level) {
  const pool = spawnWeights(level || 1);
  let total = 0;
  for (const [, w] of pool) total += w;
  let r = Math.random() * total;
  for (const [type, w] of pool) {
    if ((r -= w) < 0) return type;
  }
  return pool[0][0];
}

function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
         Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function createEnemy(type, x, y, view, level) {
  const cfg = ENEMY_TYPES[type];
  // Per-level scaling: tankier + slightly harder-hitting at higher levels.
  const lvl = level || 1;
  const hpMult = 1 + HP_PER_LEVEL * (lvl - 1);
  const dmgMult = 1 + DMG_PER_LEVEL * (lvl - 1);
  const scaledHp = Math.max(1, Math.round(cfg.hp * hpMult));
  const scaledDmg = Math.max(cfg.dmg, Math.round(cfg.dmg * dmgMult));
  const e = {
    type, x, y, level: lvl,
    w: cfg.w, h: cfg.h,
    hp: scaledHp, maxHp: scaledHp,
    dmg: scaledDmg, speed: cfg.speed, cfg,
    facing: -1,
    state: 'approach',             // approach|windup|dying|fuse|dead
    windupT: 0,
    cooldownT: 0,
    // Standoff: each attacker holds a slightly different spot around the player
    // instead of stacking on one point (T11 spacing/fairness tuning).
    standoff: (Math.random() * 2 - 1) * 42,
    hitFlash: 0,
    blockFlash: 0,                 // feedback when a straight is shield-blocked
    dyingT: 0,
    fuseT: 0,                      // blast zombie: time left on the fuse
    defeated: false,               // hp hit 0 (scored once, even during fuse)
    counted: false,                // kill already tallied by the wave manager
    lastHitId: -1,                 // last attack id that damaged this enemy
    dead: false,
    animTime: 0,
    // Shielded enemies start guarded; an uppercut opens the guard for a window.
    guardOpen: cfg.hasShield ? false : true,
    guardTimer: 0,
  };

  // Returns true if the hit is BLOCKED. A shielded enemy blocks a FRONTAL
  // straight punch while its guard is up. "Frontal" = the punch travels into
  // the side the enemy is facing (hitbox.facing === -e.facing). Uppercuts are
  // never blocked, and a hit from behind isn't either.
  e.blockCheck = function (hitbox) {
    if (!cfg.hasShield || e.guardOpen) return false;
    if (hitbox.type !== 'straight') return false;
    const frontal = hitbox.facing === -e.facing;
    return frontal;
  };

  // Apply a player punch. Returns 'blocked' | 'hit' | 'killed' | 'ignored'.
  e.applyHit = function (hitbox) {
    if (e.state === 'dying' || e.state === 'dead') return 'ignored';
    if (hitbox.id === e.lastHitId) return 'ignored';   // once per attack
    e.lastHitId = hitbox.id;
    if (e.blockCheck(hitbox)) {
      e.blockFlash = 0.15;
      return 'blocked';
    }
    // An uppercut on a shielded enemy drops its guard for a window, so
    // follow-up straight punches land ("open with an uppercut").
    if (cfg.hasShield && hitbox.type === 'uppercut') {
      e.guardOpen = true;
      e.guardTimer = cfg.guardOpenTime;
    }
    e.hp -= hitbox.dmg;
    e.hitFlash = 0.12;
    if (e.hp <= 0) {
      e.defeated = true;           // scored now; blast fuse runs before removal
      if (cfg.blast) {
        // Arm the fuse instead of dying immediately.
        e.state = 'fuse';
        e.fuseT = cfg.fuseMin + Math.random() * (cfg.fuseMax - cfg.fuseMin);
      } else {
        e.state = 'dying';
        e.dyingT = 0.25;
      }
      return 'killed';
    }
    return 'hit';
  };

  e.update = function (dt, player, dealDamage) {
    e.animTime = (e.animTime || 0) + dt;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.blockFlash > 0) e.blockFlash = Math.max(0, e.blockFlash - dt);

    // Shield guard re-raises after its open window expires.
    if (cfg.hasShield && e.guardOpen) {
      e.guardTimer -= dt;
      if (e.guardTimer <= 0) e.guardOpen = false;
    }

    if (e.state === 'dying') {
      e.dyingT -= dt;
      if (e.dyingT <= 0) { e.state = 'dead'; e.dead = true; }
      return;
    }

    if (e.state === 'fuse') {
      // Defeated blast zombie counting down to detonation (telegraphed in draw).
      e.fuseT -= dt;
      if (e.fuseT <= 0) {
        const dx = player.state.x - e.x;
        const dy = player.state.y - e.y;
        if (Math.hypot(dx, dy) <= cfg.blastRadius) dealDamage(cfg.explosionDmg);
        e.state = 'dead';
        e.dead = true;
      }
      return;
    }
    if (e.cooldownT > 0) e.cooldownT = Math.max(0, e.cooldownT - dt);

    const ps = player.state;
    const dx = ps.x - e.x;
    const dy = ps.y - e.y;
    e.facing = dx >= 0 ? 1 : -1;
    const near = Math.abs(dx) <= cfg.attackRange && Math.abs(dy) <= 50;

    if (e.state === 'approach') {
      if (near && e.cooldownT === 0) {
        e.state = 'windup';
        e.windupT = cfg.attackWindup;
      } else if (!near) {
        // Move toward a standoff spot beside the player (spreads the swarm).
        const tdx = (ps.x + e.standoff) - e.x;
        const tdy = ps.y - e.y;
        const d = Math.hypot(tdx, tdy) || 1;
        e.x += (tdx / d) * cfg.speed * dt;
        e.y += (tdy / d) * cfg.speed * 0.5 * dt;
      }
    } else if (e.state === 'windup') {
      e.windupT -= dt;
      if (e.windupT <= 0) {
        // Land the hit if the player is still in range.
        if (Math.abs(ps.x - e.x) <= cfg.attackRange + 6 && Math.abs(ps.y - e.y) <= 56) {
          dealDamage(e.dmg);
        }
        e.state = 'approach';
        e.cooldownT = cfg.attackCooldown;
      }
    }
  };

  e.draw = function (ctx) {
    // Contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 1, e.w * 0.7, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hand-painted illustrated enemy (skeletons / zombies)
    Assets.drawEnemy(ctx, e, e.animTime || 0);
  };

  return e;
}

// --- Bat (T6) -----------------------------------------------------------
// A flying harasser. It follows from a distance (high, out of punch reach),
// periodically SWOOPS to chip the player, and is killable ONLY by an uppercut
// while it's low (a timed swoop kill, OR an uppercut aimed at another enemy
// that also catches the bat — same thing: any uppercut hitbox that overlaps it
// while low). Straight punches never affect it. Never spawns in a boss fight.
const BAT_CFG = {
  label: 'bat', w: 36, h: 16, hp: 1, swoopDmg: 1,
  hoverOffset: 185,        // hover this far above the player's feet line
  swoopDepth: 78,          // dips to player.y - this (inside uppercut reach)
  followSpeed: 150, swoopSpeed: 360, retreatSpeed: 240,
  swoopCdMin: 3.0, swoopCdMax: 5.0, contactX: 40,
};

function createBat(x, y, view) {
  const cfg = BAT_CFG;
  const e = {
    type: 'bat', family: 'bat', isBat: true, cfg,
    x, y, w: cfg.w, h: cfg.h,
    hp: cfg.hp, maxHp: cfg.hp,
    facing: 1,
    state: 'enter',          // enter|follow|swoop|retreat|dying|dead
    swoopCd: cfg.swoopCdMin + Math.random() * (cfg.swoopCdMax - cfg.swoopCdMin),
    struck: false,
    hitFlash: 0, dyingT: 0,
    defeated: false, counted: false, dead: false,
    lastHitId: -1,
  };

  // Collision box is centered on (x, y) — the bat flies, so y is NOT a feet line.
  // During a swoop, use the visible body envelope so the uppercut timing
  // window is forgiving enough for normal play without making flying bats
  // vulnerable while they are safely out of reach.
  e.hitBox = function () {
    if (e.state === 'swoop') {
      return { x: e.x, y: e.y, w: 58, h: 64 };
    }
    return { x: e.x, y: e.y, w: e.w, h: e.h };
  };

  // Bats are immune to everything but an uppercut, and an uppercut only
  // overlaps when the bat is low (swooping) — that's the timing window.
  e.applyHit = function (hitbox) {
    if (e.state === 'dying' || e.dead) return 'ignored';
    if (hitbox.id === e.lastHitId) return 'ignored';
    e.lastHitId = hitbox.id;
    if (hitbox.type !== 'uppercut') return 'ignored';   // straights do nothing
    e.hp -= hitbox.dmg;
    e.hitFlash = 0.12;
    e.defeated = true;
    e.state = 'dying';
    e.dyingT = 0.2;
    return 'killed';
  };

  e.update = function (dt, player, dealDamage) {
    e.animTime = (e.animTime || 0) + dt;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.state === 'dying') {
      e.dyingT -= dt;
      if (e.dyingT <= 0) { e.state = 'dead'; e.dead = true; }
      return;
    }

    const ps = player.state;
    const hoverY = ps.y - cfg.hoverOffset;
    e.facing = ps.x >= e.x ? 1 : -1;
    const moveToward = (tx, ty, sp) => {
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * sp * dt;
      e.y += (dy / d) * sp * dt;
      return d;
    };

    if (e.state === 'enter') {
      if (moveToward(ps.x, hoverY, cfg.swoopSpeed) < 14) e.state = 'follow';
    } else if (e.state === 'follow') {
      // Track the player horizontally while staying high (out of reach).
      moveToward(ps.x, hoverY, cfg.followSpeed);
      e.swoopCd -= dt;
      if (e.swoopCd <= 0) { e.state = 'swoop'; e.struck = false; }
    } else if (e.state === 'swoop') {
      const d = moveToward(ps.x, ps.y - cfg.swoopDepth, cfg.swoopSpeed);
      // Chip the player on contact (once per swoop).
      if (!e.struck && Math.abs(ps.x - e.x) < cfg.contactX && e.y > ps.y - cfg.hoverOffset + 40) {
        dealDamage(cfg.swoopDmg);
        e.struck = true;
      }
      if (d < 16) e.state = 'retreat';
    } else if (e.state === 'retreat') {
      if (moveToward(e.x, hoverY, cfg.retreatSpeed) < 12) {
        e.state = 'follow';
        e.swoopCd = cfg.swoopCdMin + Math.random() * (cfg.swoopCdMax - cfg.swoopCdMin);
      }
    }
  };

  e.draw = function (ctx) {
    // Faint ground shadow projected below the bat
    const groundY = view.h - 90;
    const alt = Math.max(0, groundY - e.y);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + (0.28 - Math.min(0.2, alt / 1200)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(e.x, groundY + 1, 16 - Math.min(8, alt / 24), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hand-painted illustrated bat with flapping wings
    Assets.drawBat(ctx, e, e.animTime || 0);
  };

  return e;
}

// --- Ogre boss (T7) -----------------------------------------------------
// Periodic boss (~every 5 levels). The fight is isolated — the wave manager
// clears other enemies and suppresses spawns while it's active.
//   Long range: club swing + laser eyes (1 dmg).
//   Short range: a RANDOM mix of ground-slam (2), grab (2), club-sweep (1),
//   chosen unpredictably.
// HP ~30 on first appearance, +25% each later appearance. Big silhouette with
// a single eye; full arena framing lands in T9.
const OGRE_CFG = {
  baseHp: 30, w: 92, h: 150, speed: 42,
  longRange: 170,            // dx beyond this → long-range attack pool
  attackCd: 1.0,
  attacks: {
    club_long:   { range: 'long',  windup: 0.60, active: 0.16, dmg: 1, reach: 250, min: 70 },
    laser_eyes:  { range: 'long',  windup: 0.70, active: 0.30, dmg: 1, reach: 620 },
    ground_slam: { range: 'short', windup: 0.55, active: 0.20, dmg: 2, radius: 150 },
    grab:        { range: 'short', windup: 0.45, active: 0.12, dmg: 2, reach: 90 },
    club_sweep:  { range: 'short', windup: 0.42, active: 0.20, dmg: 1, reach: 160 },
  },
  longPool: ['club_long', 'laser_eyes'],
  shortPool: ['ground_slam', 'grab', 'club_sweep'],
};

function createOgre(x, y, view, hp) {
  const cfg = OGRE_CFG;
  const e = {
    type: 'ogre', family: 'ogre', isBoss: true, noScore: true, cfg,
    x, y, w: cfg.w, h: cfg.h,
    hp: hp, maxHp: hp,
    facing: -1,
    state: 'idle',             // idle|windup|active|recover|dying|dead
    attack: null,              // current attack key
    atkT: 0, cdT: 0.8,
    beamTargetX: 0, struck: false,
    hitFlash: 0, dyingT: 0,
    defeated: false, counted: false, dead: false,
    lastHitId: -1,
  };

  e.hitBox = function () { return { x: e.x, y: e.y - e.h / 2, w: e.w, h: e.h }; };

  // Ogre is hurt by any punch (big HP bar). No shield.
  e.applyHit = function (hitbox) {
    if (e.state === 'dying' || e.dead) return 'ignored';
    if (hitbox.id === e.lastHitId) return 'ignored';
    e.lastHitId = hitbox.id;
    e.hp -= hitbox.dmg;
    e.hitFlash = 0.1;
    if (e.hp <= 0) {
      e.defeated = true;
      e.state = 'dying';
      e.dyingT = 0.6;
      return 'killed';
    }
    return 'hit';
  };

  function pick(pool) { return pool[(Math.random() * pool.length) | 0]; }

  e.update = function (dt, player, dealDamage) {
    e.animTime = (e.animTime || 0) + dt;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.state === 'dying') {
      e.dyingT -= dt;
      if (e.dyingT <= 0) { e.state = 'dead'; e.dead = true; }
      return;
    }

    const ps = player.state;
    const dx = ps.x - e.x;
    e.facing = dx >= 0 ? 1 : -1;
    const adx = Math.abs(dx);

    if (e.state === 'idle') {
      if (e.cdT > 0) e.cdT -= dt;
      // Drift toward the player when out of range; otherwise choose an attack.
      if (adx > cfg.longRange * 1.4) {
        e.x += Math.sign(dx) * cfg.speed * dt;
      } else if (e.cdT <= 0) {
        const pool = adx > cfg.longRange ? cfg.longPool : cfg.shortPool;
        e.attack = pick(pool);
        e.state = 'windup';
        e.atkT = cfg.attacks[e.attack].windup;
        e.struck = false;
        if (e.attack === 'laser_eyes') e.beamTargetX = ps.x;   // telegraph aim
      }
    } else if (e.state === 'windup') {
      e.atkT -= dt;
      if (e.atkT <= 0) { e.state = 'active'; e.atkT = cfg.attacks[e.attack].active; }
    } else if (e.state === 'active') {
      e.atkT -= dt;
      if (!e.struck) {
        const a = cfg.attacks[e.attack];
        let hit = false;
        const frontal = Math.sign(dx) === e.facing;
        if (e.attack === 'club_long') {
          hit = frontal && adx >= a.min && adx <= a.reach;
        } else if (e.attack === 'laser_eyes') {
          hit = frontal && adx <= a.reach && Math.abs(ps.x - e.beamTargetX) <= 46;
        } else if (e.attack === 'ground_slam') {
          const d = Math.hypot(ps.x - e.x, ps.y - e.y);
          hit = d <= a.radius;
        } else if (e.attack === 'grab') {
          hit = frontal && adx <= a.reach;
        } else if (e.attack === 'club_sweep') {
          hit = frontal && adx <= a.reach;
        }
        if (hit) { dealDamage(a.dmg); e.struck = true; }
      }
      if (e.atkT <= 0) { e.state = 'recover'; e.atkT = 0.3; }
    } else if (e.state === 'recover') {
      e.atkT -= dt;
      if (e.atkT <= 0) { e.state = 'idle'; e.cdT = cfg.attackCd; }
    }
  };

  e.draw = function (ctx) {
    // Heavy contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 2, e.w * 0.65, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hand-painted illustrated ogre boss & comic-book attack telegraphs
    Assets.drawOgre(ctx, e, e.animTime || 0);
  };

  return e;
}

function createWaveManager(view, player) {
  const GROUND_Y = view.h - 90;
  const m = {
    enemies: [],
    level: 1,
    kills: 0,
    killsThisLevel: 0,
    spawnTimer: 0.6,
    bossActive: false,       // true during an ogre fight (isolated)
    batTimer: 3.0,
    boss: null,              // the live ogre, or null
    bossLevel: 5,            // next level that triggers a boss (~every 5)
    bossCount: 0,            // ogres defeated so far (drives HP scaling)
  };

  function maxConcurrent() {
    // Grows with level: +1 every 2 levels, capped (GDD ~10-12).
    return Math.min(MAX_CONCURRENT_CAP, BASE_MAX_CONCURRENT + Math.floor((m.level - 1) / 2));
  }

  function liveCount(pred) {
    let n = 0;
    for (const e of m.enemies) if (e.state !== 'dead' && pred(e)) n++;
    return n;
  }

  function spawn() {
    // Enter from a side edge at a random depth near the ground plane.
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -20 : view.w + 20;
    const y = GROUND_Y - Math.random() * 40;
    m.enemies.push(createEnemy(pickSpawnType(m.level), x, y, view, m.level));
  }

  function spawnBat() {
    const x = 40 + Math.random() * (view.w - 80);
    m.enemies.push(createBat(x, -20, view));
  }

  function startBoss() {
    // Isolate the fight: remove all current enemies (and bats).
    m.enemies.length = 0;
    m.bossActive = true;
    const hp = Math.round(OGRE_CFG.baseHp * Math.pow(1.25, m.bossCount));
    const ogre = createOgre(view.w * 0.72, GROUND_Y, view, hp);
    m.boss = ogre;
    m.enemies.push(ogre);
  }

  function endBoss() {
    m.bossActive = false;
    m.boss = null;
    m.bossCount++;
    m.bossLevel += 5;          // next ogre ~5 levels later
  }

  m.update = function (dt) {
    // Trigger a boss when the level reaches the next boss threshold.
    if (!m.bossActive && m.level >= m.bossLevel) {
      startBoss();
    }

    // Ground-enemy spawn pacing (bats don't count toward this cap).
    if (!m.bossActive && liveCount((e) => !e.isBat) < maxConcurrent()) {
      m.spawnTimer -= dt;
      if (m.spawnTimer <= 0) {
        spawn();
        m.spawnTimer = 0.9 + Math.random() * 0.6;
      }
    }

    // Bat spawning: from ~level 2, infrequent, 1-2 max, never in a boss fight.
    if (!m.bossActive && m.level >= 2) {
      m.batTimer -= dt;
      if (m.batTimer <= 0) {
        if (liveCount((e) => e.isBat) < BAT_MAX && Math.random() < BAT_SPAWN_CHANCE) {
          spawnBat();
        }
        m.batTimer = 3.0 + Math.random() * 2.0;
      }
    }

    // Advance enemies; they damage the player through takeDamage.
    for (const e of m.enemies) {
      e.update(dt, player, (dmg) => player.takeDamage(dmg));
    }

    // Score kills at the moment of defeat (hp 0), so a blast zombie counts
    // when you down it, not after its fuse detonates.
    for (const e of m.enemies) {
      if (e.defeated && !e.counted) {
        e.counted = true;
        if (e.noScore) continue;     // boss doesn't count toward leveling
        m.kills++;
        m.killsThisLevel++;
        if (m.killsThisLevel >= KILLS_PER_LEVEL) {
          m.killsThisLevel = 0;
          m.level++;
        }
      }
    }

    // Reap fully-dead enemies (after dying anim / blast detonation).
    for (let i = m.enemies.length - 1; i >= 0; i--) {
      if (m.enemies[i].dead) m.enemies.splice(i, 1);
    }

    // End the boss fight once the ogre is gone, then resume normal waves.
    if (m.bossActive && (!m.boss || m.boss.dead)) {
      endBoss();
    }
  };

  // Apply the player's active punch hitbox to any overlapping enemy.
  // Returns the list of outcomes (for tests / feedback).
  m.applyPlayerAttack = function (hitbox) {
    if (!hitbox) return [];
    const results = [];
    for (const e of m.enemies) {
      // Flying enemies supply their own centered box; ground enemies' y is the
      // feet, so compare against the body's vertical center.
      const box = e.hitBox ? e.hitBox() : { x: e.x, y: e.y - e.h / 2, w: e.w, h: e.h };
      if (aabbOverlap(hitbox, box)) {
        results.push(e.applyHit(hitbox));
      }
    }
    return results;
  };

  m.draw = function (ctx) {
    // Draw back-to-front by y so closer enemies overlap correctly.
    const ordered = m.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of ordered) e.draw(ctx);
  };

  m.reset = function () {
    m.enemies.length = 0;
    m.level = 1;
    m.kills = 0;
    m.killsThisLevel = 0;
    m.spawnTimer = 0.6;
    m.bossActive = false;
    m.batTimer = 3.0;
    m.boss = null;
    m.bossLevel = 5;
    m.bossCount = 0;
  };

  return m;
}
