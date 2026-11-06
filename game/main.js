/*
 * Flip The Switch — main entry point.
 *
 * T0 scaffold: boots a canvas and runs a fixed-timestep game loop.
 * update(dt) advances simulation in fixed steps; render(alpha) draws.
 * Enemies, player, combat, world, etc. land in later milestones (T1+).
 */
'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Logical resolution the game is designed against. Rendering uses these
  // dimensions regardless of the on-screen (CSS) size of the canvas.
  const VIEW_W = canvas.width;
  const VIEW_H = canvas.height;

  // --- Fixed-timestep loop ------------------------------------------------
  // Simulation runs at a constant rate (STEP seconds per update) so game
  // behavior is deterministic and frame-rate independent. Rendering happens
  // once per animation frame, interpolated by `alpha` between steps.
  const STEP = 1 / 60;            // 60 simulation updates per second
  const MAX_FRAME = 0.25;         // clamp huge gaps (e.g. tab was backgrounded)

  let accumulator = 0;
  let lastTime = 0;
  let running = true;

  // Minimal game state placeholder for the scaffold.
  const state = {
    time: 0,   // total simulated seconds
    fps: 0,
  };

  function update(dt) {
    state.time += dt;
  }

  function render(alpha) {
    // Clear to the dark gothic base.
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Scaffold placeholder so it's visibly "running".
    ctx.fillStyle = '#5a5a7a';
    ctx.font = '20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Flip The Switch', VIEW_W / 2, VIEW_H / 2 - 14);

    ctx.fillStyle = '#33334a';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('scaffold running (T0)', VIEW_W / 2, VIEW_H / 2 + 14);

    // Live heartbeat so the loop is observably ticking.
    ctx.textAlign = 'left';
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

    const alpha = accumulator / STEP;
    render(alpha);

    requestAnimationFrame(frame);
  }

  // Pause the loop when the tab is hidden so time doesn't jump on return.
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
