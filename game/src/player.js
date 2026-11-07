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
    animTime: 0,

    // Attack state machine.
    attack: null,                   // { type, t, dur, dmg, angle, id }
  };

  let attackCounter = 0;            // unique id per attack instance

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
    p.attack = { type, t: 0, dur: def.dur, dmg: def.dmg, angle, def, id: ++attackCounter };
  }

  function update(dt) {
    p.animTime += dt;
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
    const { t, def, angle, dmg, type, id } = p.attack;
    const [a0, a1] = def.active;
    if (t < a0 || t > a1) return null;
    const originX = p.x + p.facing * (p.w / 2);
    const originY = p.y - p.h * 0.55;
    const cx = originX + Math.cos(angle) * def.reach * p.facing;
    const cy = originY + Math.sin(angle) * def.reach;
    // `id` lets collision apply a punch once per enemy; `facing` lets enemies
    // judge whether the hit came from the front (shield-block rule, T4).
    return { x: cx, y: cy, w: def.boxW, h: def.boxH, dmg, type, id, facing: p.facing, angle };
  }

  function draw(ctx) {
    // Contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, p.w * 0.8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hand-painted illustrated brawler character
    Assets.drawPlayer(ctx, p, p.animTime);

    // Active punch crescent slash VFX
    const hb = activeHitbox();
    if (hb) {
      Assets.drawAttackVFX(ctx, hb);
    }
  }

  return { state: p, update, draw, activeHitbox, takeDamage, reset };
}
