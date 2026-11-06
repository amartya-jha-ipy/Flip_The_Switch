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
const BASE_MAX_CONCURRENT = 3;      // T8 will scale this with level

const ENEMY_TYPES = {
  // Generic base enemy for T3. Variants arrive in T4/T5 with their own entries.
  grunt: {
    hp: 2, dmg: 1, speed: 74, w: 30, h: 84,
    attackRange: 46, attackWindup: 0.45, attackCooldown: 1.1,
    color: '#171720', stroke: '#473a3a',
  },
};

function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
         Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function createEnemy(type, x, y, view) {
  const cfg = ENEMY_TYPES[type];
  const e = {
    type, x, y,
    w: cfg.w, h: cfg.h,
    hp: cfg.hp, maxHp: cfg.hp,
    dmg: cfg.dmg, speed: cfg.speed, cfg,
    facing: -1,
    state: 'approach',             // 'approach' | 'windup' | 'recover' | 'dying' | 'dead'
    windupT: 0,
    cooldownT: 0,
    hitFlash: 0,
    dyingT: 0,
    lastHitId: -1,                 // last attack id that damaged this enemy
    dead: false,
  };

  // Default: nothing is blocked. T4 sword+shield overrides this.
  e.blockCheck = function (/* hitbox */) { return false; };

  // Apply a player punch. Returns 'blocked' | 'hit' | 'killed' | 'ignored'.
  e.applyHit = function (hitbox) {
    if (e.state === 'dying' || e.state === 'dead') return 'ignored';
    if (hitbox.id === e.lastHitId) return 'ignored';   // once per attack
    e.lastHitId = hitbox.id;
    if (e.blockCheck(hitbox)) return 'blocked';
    e.hp -= hitbox.dmg;
    e.hitFlash = 0.12;
    if (e.hp <= 0) {
      e.state = 'dying';
      e.dyingT = 0.25;
      return 'killed';
    }
    return 'hit';
  };

  e.update = function (dt, player, dealDamage) {
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

    if (e.state === 'dying') {
      e.dyingT -= dt;
      if (e.dyingT <= 0) { e.state = 'dead'; e.dead = true; }
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
        // Move toward the player.
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * cfg.speed * dt;
        e.y += (dy / d) * cfg.speed * 0.5 * dt;
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
    ctx.save();
    const dying = e.state === 'dying';
    if (dying) ctx.globalAlpha = Math.max(0, e.dyingT / 0.25);
    const flashing = e.hitFlash > 0;
    const windup = e.state === 'windup';
    ctx.fillStyle = flashing ? '#5a2020' : (windup ? '#241a1a' : cfg.color);
    ctx.strokeStyle = flashing ? '#b05050' : cfg.stroke;
    ctx.lineWidth = 2;

    const bx = e.x - e.w / 2, by = e.y - e.h;
    ctx.fillRect(bx, by + 20, e.w, e.h - 20);
    ctx.strokeRect(bx, by + 20, e.w, e.h - 20);
    ctx.beginPath();
    ctx.arc(e.x, by + 11, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mini HP bar above the enemy (hidden at full for cleanliness).
    if (e.hp < e.maxHp && !dying) {
      const bw = e.w + 6, bh = 4;
      const frac = Math.max(0, e.hp / e.maxHp);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - bw / 2, by - 8, bw, bh);
      ctx.fillStyle = '#c0304a';
      ctx.fillRect(e.x - bw / 2, by - 8, bw * frac, bh);
    }
    ctx.restore();
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
  };

  function maxConcurrent() {
    // T3 baseline; T8 will grow this with level.
    return BASE_MAX_CONCURRENT;
  }

  function spawn() {
    // Enter from a side edge at a random depth near the ground plane.
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -20 : view.w + 20;
    const y = GROUND_Y - Math.random() * 40;
    m.enemies.push(createEnemy('grunt', x, y, view));
  }

  m.update = function (dt) {
    // Spawn pacing.
    if (m.enemies.length < maxConcurrent()) {
      m.spawnTimer -= dt;
      if (m.spawnTimer <= 0) {
        spawn();
        m.spawnTimer = 0.9 + Math.random() * 0.6;
      }
    }

    // Advance enemies; they damage the player through takeDamage.
    for (const e of m.enemies) {
      e.update(dt, player, (dmg) => player.takeDamage(dmg));
    }

    // Reap the dead and count kills for leveling.
    for (let i = m.enemies.length - 1; i >= 0; i--) {
      if (m.enemies[i].dead) {
        m.enemies.splice(i, 1);
        m.kills++;
        m.killsThisLevel++;
        if (m.killsThisLevel >= KILLS_PER_LEVEL) {
          m.killsThisLevel = 0;
          m.level++;
        }
      }
    }
  };

  // Apply the player's active punch hitbox to any overlapping enemy.
  // Returns the list of outcomes (for tests / feedback).
  m.applyPlayerAttack = function (hitbox) {
    if (!hitbox) return [];
    const results = [];
    for (const e of m.enemies) {
      // e.y is the feet; compare against the body's vertical center.
      const box = { x: e.x, y: e.y - e.h / 2, w: e.w, h: e.h };
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
  };

  return m;
}
