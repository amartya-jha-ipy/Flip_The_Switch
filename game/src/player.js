/*
 * Player (T1) — joystick-driven movement + two attacks.
 *
 * Movement: side-on brawler. The joystick X drives horizontal movement along
 * the ground; a small Y component lets the player nudge toward/away (depth)
 * within a band, kept subtle so the game stays side-on. Facing flips with
 * horizontal input.
 *
 * Attacks (Shadow-Fight-style directional aim):
 *   - straight punch: fast forward jab, 1 damage. Aims horizontally in the
 *     facing direction, angled upward when the joystick is held up.
 *   - uppercut: slower rising punch, 2 damage. Arcs up-forward. (Later the
 *     only bat-killer — T6.)
 * The active-frame hitbox is exposed via `activeHitbox()` for later enemy
 * collision; here it's also drawn so attacks are visibly directional.
 */
'use strict';

function createPlayer(view) {
  const GROUND_Y = view.h - 90;     // baseline the player stands on
  const DEPTH_BAND = 46;            // how far up/down the player may shift

  const MAX_HP = 5;                  // fixed by brief

  const p = {
    x: view.w * 0.35,
    y: GROUND_Y,
    speed: 260,                     // px/sec
    facing: 1,                      // 1 = right, -1 = left
    w: 34,
    h: 96,

    hp: MAX_HP,
    maxHp: MAX_HP,
    alive: true,
    hurtTimer: 0,                   // brief i-frames + flash after a hit

    // Attack state machine.
    attack: null,                   // { type, t, dur, dmg, angle, hit }
  };

  // Apply damage. Returns true if the hit landed (not during i-frames).
  function takeDamage(amount) {
    if (!p.alive || p.hurtTimer > 0) return false;
    p.hp = Math.max(0, p.hp - amount);
    p.hurtTimer = 0.6;              // invulnerability window after a hit
    if (p.hp <= 0) p.alive = false;
    return true;
  }

  // Reset to a fresh run (endless — called on restart).
  function reset() {
    p.hp = MAX_HP;
    p.alive = true;
    p.hurtTimer = 0;
    p.attack = null;
    p.x = view.w * 0.35;
    p.y = GROUND_Y;
    p.facing = 1;
  }

  const ATTACK_DEFS = {
    straight: { dur: 0.26, active: [0.06, 0.16], dmg: 1, reach: 62, boxW: 54, boxH: 30 },
    uppercut: { dur: 0.40, active: [0.10, 0.26], dmg: 2, reach: 44, boxW: 46, boxH: 70 },
  };

  function startAttack(type) {
    if (p.attack) return;           // no canceling mid-attack (T1 keeps it simple)
    const def = ATTACK_DEFS[type];
    // Aim: straight punch angles up when aiming high; uppercut always rises.
    let angle;
    if (type === 'uppercut') {
      angle = -0.9;                 // radians above horizontal, forward-up
    } else {
      angle = Input.aimUp() ? -0.5 : 0;
    }
    p.attack = { type, t: 0, dur: def.dur, dmg: def.dmg, angle, def };
  }

  function update(dt) {
    if (p.hurtTimer > 0) p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    if (!p.alive) return;           // no control while downed

    const mv = Input.move;

    // Horizontal movement + facing.
    p.x += mv.x * p.speed * dt;
    if (mv.x > 0.2) p.facing = 1;
    else if (mv.x < -0.2) p.facing = -1;

    // Subtle depth shift (kept small to preserve the side-on feel).
    p.y += mv.y * p.speed * 0.5 * dt;

    // Clamp to the arena.
    const half = p.w / 2;
    p.x = Math.max(half + 10, Math.min(view.w - half - 10, p.x));
    p.y = Math.max(GROUND_Y - DEPTH_BAND, Math.min(GROUND_Y + DEPTH_BAND * 0.4, p.y));

    // Attack input.
    const req = Input.consumeAttack();
    if (req) startAttack(req);

    // Advance attack.
    if (p.attack) {
      p.attack.t += dt;
      if (p.attack.t >= p.attack.dur) p.attack = null;
    }
  }

  // Current active-frame hitbox in world coords, or null.
  function activeHitbox() {
    if (!p.attack) return null;
    const { t, def, angle, dmg, type } = p.attack;
    const [a0, a1] = def.active;
    if (t < a0 || t > a1) return null;
    const originX = p.x + p.facing * (p.w / 2);
    const originY = p.y - p.h * 0.55;
    const cx = originX + Math.cos(angle) * def.reach * p.facing;
    const cy = originY + Math.sin(angle) * def.reach;
    return { x: cx, y: cy, w: def.boxW, h: def.boxH, dmg, type };
  }

  function draw(ctx) {
    // Player silhouette (placeholder; real art in T10).
    ctx.save();
    // Flash red briefly after taking a hit; dim when downed.
    const flashing = p.hurtTimer > 0 && Math.floor(p.hurtTimer * 20) % 2 === 0;
    ctx.fillStyle = !p.alive ? '#1a0e10' : (flashing ? '#3a1414' : '#12121a');
    ctx.strokeStyle = flashing ? '#a04040' : '#3a3a52';
    ctx.lineWidth = 2;

    const bx = p.x - p.w / 2;
    const by = p.y - p.h;
    // Body
    ctx.fillRect(bx, by + 22, p.w, p.h - 22);
    ctx.strokeRect(bx, by + 22, p.w, p.h - 22);
    // Head
    ctx.beginPath();
    ctx.arc(p.x, by + 12, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Facing marker (a small nub on the front).
    ctx.fillStyle = '#5a5a7a';
    ctx.fillRect(p.x + p.facing * (p.w / 2) - (p.facing < 0 ? 6 : 0), by + 40, 6, 10);

    // Active punch hitbox, drawn so the directional aim is visible.
    const hb = activeHitbox();
    if (hb) {
      ctx.fillStyle = hb.type === 'uppercut' ? 'rgba(180,140,255,0.5)' : 'rgba(140,200,255,0.5)';
      ctx.fillRect(hb.x - hb.w / 2, hb.y - hb.h / 2, hb.w, hb.h);
    }
    ctx.restore();
  }

  return { state: p, update, draw, activeHitbox, takeDamage, reset };
}
