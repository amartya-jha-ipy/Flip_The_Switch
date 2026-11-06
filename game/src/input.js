/*
 * Input (T1) — on-screen joystick + two attack buttons, with keyboard fallback.
 *
 * Exposes a single global `Input` with:
 *   Input.init(canvas)         wire up pointer + keyboard listeners
 *   Input.move                 {x, y} analog move vector, each in [-1, 1]
 *   Input.consumeAttack()      returns 'straight' | 'uppercut' | null (one-shot)
 *   Input.aimUp                true while the player is aiming high (joystick/keys up)
 *   Input.draw(ctx)            renders the joystick + buttons
 *
 * Pointer coordinates are mapped from client space into the canvas's logical
 * resolution, since the canvas is CSS-scaled to fit the viewport.
 */
'use strict';

const Input = (function () {
  // Control geometry in logical canvas coordinates (960x540).
  const JOY = { cx: 150, cy: 400, radius: 80, knob: 38 };
  const BTN_STRAIGHT = { cx: 760, cy: 430, r: 48, label: 'JAB', key: 'straight' };
  const BTN_UPPER = { cx: 860, cy: 340, r: 44, label: 'UP', key: 'uppercut' };

  const move = { x: 0, y: 0 };
  let aimUp = false;

  // Pending attack requests, drained by consumeAttack().
  const attackQueue = [];

  // Active pointers: id -> {role, ...}. role is 'joystick' or a button key.
  const pointers = new Map();
  let joyKnob = { x: JOY.cx, y: JOY.cy };

  // Keyboard state (desktop testing).
  const keys = { up: false, down: false, left: false, right: false };

  let canvasEl = null;

  function clientToLogical(evt) {
    const rect = canvasEl.getBoundingClientRect();
    const sx = canvasEl.width / rect.width;
    const sy = canvasEl.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function hitButton(p) {
    if (dist(p.x, p.y, BTN_STRAIGHT.cx, BTN_STRAIGHT.cy) <= BTN_STRAIGHT.r) return BTN_STRAIGHT;
    if (dist(p.x, p.y, BTN_UPPER.cx, BTN_UPPER.cy) <= BTN_UPPER.r) return BTN_UPPER;
    return null;
  }

  function onDown(evt) {
    evt.preventDefault();
    const p = clientToLogical(evt);
    const id = evt.pointerId;

    const btn = hitButton(p);
    if (btn) {
      pointers.set(id, { role: btn.key });
      attackQueue.push(btn.key);
      return;
    }

    // Anything on the left half starts/controls the joystick.
    if (p.x < canvasEl.width / 2) {
      pointers.set(id, { role: 'joystick' });
      updateJoystick(p);
    }
  }

  function onMove(evt) {
    const rec = pointers.get(evt.pointerId);
    if (!rec || rec.role !== 'joystick') return;
    evt.preventDefault();
    updateJoystick(clientToLogical(evt));
  }

  function onUp(evt) {
    const rec = pointers.get(evt.pointerId);
    if (!rec) return;
    if (rec.role === 'joystick') resetJoystick();
    pointers.delete(evt.pointerId);
  }

  function updateJoystick(p) {
    let dx = p.x - JOY.cx;
    let dy = p.y - JOY.cy;
    const d = Math.hypot(dx, dy);
    if (d > JOY.radius) {
      dx = (dx / d) * JOY.radius;
      dy = (dy / d) * JOY.radius;
    }
    joyKnob = { x: JOY.cx + dx, y: JOY.cy + dy };
    move.x = dx / JOY.radius;
    move.y = dy / JOY.radius;
    aimUp = move.y < -0.4;
  }

  function resetJoystick() {
    joyKnob = { x: JOY.cx, y: JOY.cy };
    move.x = 0;
    move.y = 0;
    aimUp = keys.up;
  }

  // --- Keyboard fallback (desktop) ---------------------------------------
  function applyKeys() {
    // Only drive move from keys when no joystick pointer is active.
    const joyActive = [...pointers.values()].some(r => r.role === 'joystick');
    if (joyActive) return;
    move.x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    move.y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    aimUp = keys.up;
  }

  function onKeyDown(e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = true; break;
      case 'ArrowDown': case 's': case 'S': keys.down = true; break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = true; break;
      case 'ArrowRight': case 'd': case 'D': keys.right = true; break;
      case 'j': case 'J': attackQueue.push('straight'); break;
      case 'k': case 'K': attackQueue.push('uppercut'); break;
      default: return;
    }
    applyKeys();
  }

  function onKeyUp(e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
      case 'ArrowDown': case 's': case 'S': keys.down = false; break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
      case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
      default: return;
    }
    applyKeys();
  }

  function init(canvas) {
    canvasEl = canvas;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function consumeAttack() {
    return attackQueue.length ? attackQueue.shift() : null;
  }

  // --- Rendering of the virtual controls ---------------------------------
  function ring(ctx, cx, cy, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function button(ctx, b, pressed) {
    ring(ctx, b.cx, b.cy, b.r, pressed ? 'rgba(150,120,180,0.35)' : 'rgba(80,80,110,0.18)', 'rgba(140,140,180,0.5)');
    ctx.fillStyle = 'rgba(200,200,220,0.75)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.cx, b.cy);
  }

  function draw(ctx) {
    const pressedStraight = [...pointers.values()].some(r => r.role === 'straight');
    const pressedUpper = [...pointers.values()].some(r => r.role === 'uppercut');

    // Joystick base + knob.
    ring(ctx, JOY.cx, JOY.cy, JOY.radius, 'rgba(60,60,90,0.15)', 'rgba(140,140,180,0.4)');
    ring(ctx, joyKnob.x, joyKnob.y, JOY.knob, 'rgba(150,150,200,0.3)', 'rgba(170,170,210,0.6)');

    button(ctx, BTN_STRAIGHT, pressedStraight);
    button(ctx, BTN_UPPER, pressedUpper);
  }

  return { init, move, aimUp: () => aimUp, consumeAttack, draw };
})();
