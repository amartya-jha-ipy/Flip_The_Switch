/*
 * Flip The Switch — main entry point.
 *
 * Fixed-timestep game loop. update(dt) advances simulation in fixed steps;
 * render(alpha) draws. Scaffold (T0) established the loop; T1 adds the player
 * (joystick movement + straight/uppercut attacks).
 */
'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const view = { w: canvas.width, h: canvas.height };

  // --- Fixed-timestep loop ------------------------------------------------
  const STEP = 1 / 60;
  const MAX_FRAME = 0.25;

  let accumulator = 0;
  let lastTime = 0;
  let running = true;

  const state = { time: 0, fps: 0 };

  // --- Entities -----------------------------------------------------------
  Input.init(canvas);
  const player = createPlayer(view);

  function update(dt) {
    state.time += dt;
    player.update(dt);
  }

  function drawGround(ctx) {
    // Simple ground plane placeholder (parallax world arrives in T9).
    const groundY = view.h - 90;
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, groundY, view.w, view.h - groundY);
    ctx.strokeStyle = '#1b1b2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(view.w, groundY);
    ctx.stroke();
  }

  function render(alpha) {
    // Dark gothic base.
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, view.w, view.h);

    drawGround(ctx);
    player.draw(ctx);
    Input.draw(ctx);

    // Debug heartbeat.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2a2a3a';
    ctx.font = '12px monospace';
    ctx.fillText('t=' + state.time.toFixed(1) + 's  fps=' + Math.round(state.fps), 10, 18);
  }

  function frame(now) {
    if (!running) return;
    if (!lastTime) lastTime = now;

    let frameTime = (now - lastTime) / 1000;
    lastTime = now;
    if (frameTime > MAX_FRAME) frameTime = MAX_FRAME;
    state.fps = frameTime > 0 ? 1 / frameTime : 0;

    accumulator += frameTime;
    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }

    render(accumulator / STEP);
    requestAnimationFrame(frame);
  }

  // Debug/QA hook: inspect live state from the console (no effect on gameplay).
  window.FTS = { state, player, view, input: Input };

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      lastTime = 0;
      requestAnimationFrame(frame);
    }
  });

  requestAnimationFrame(frame);
})();
