/*
 * Flip The Switch — main entry point.
 *
 * Fixed-timestep game loop + top-level game state.
 *   T0: loop/scaffold.
 *   T1: player (joystick movement + straight/uppercut).
 *   T2: 5 HP health, loss at 0, endless run (no win state), game-over + restart.
 */
'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const view = { w: canvas.width, h: canvas.height };

  const DEBUG = /[?&]debug=1\b/.test(location.search);

  // --- Fixed-timestep loop ------------------------------------------------
  const STEP = 1 / 60;
  const MAX_FRAME = 0.25;
  let accumulator = 0;
  let lastTime = 0;
  let running = true;

  const state = { time: 0, fps: 0, mode: 'playing' }; // 'playing' | 'gameover'

  // --- Entities -----------------------------------------------------------
  Input.init(canvas);
  const player = createPlayer(view);
  const waves = createWaveManager(view, player);

  function restart() {
    player.reset();
    waves.reset();
    state.mode = 'playing';
    state.time = 0;
  }

  function update(dt) {
    state.time += dt;
    if (state.mode === 'playing') {
      player.update(dt);
      waves.update(dt);
      // Player's active punch damages overlapping enemies (once per attack).
      waves.applyPlayerAttack(player.activeHitbox());
      // Endless: there is deliberately NO win condition. The only end state
      // is loss when health reaches 0.
      if (!player.state.alive) state.mode = 'gameover';
    }
  }

  // --- Rendering ----------------------------------------------------------
  function drawGround() {
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

  function drawHUD() {
    // Health pips (top-left).
    const hp = player.state.hp, max = player.state.maxHp;
    const x0 = 20, y0 = 24, size = 22, gap = 8;
    for (let i = 0; i < max; i++) {
      const x = x0 + i * (size + gap);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(200,120,140,0.7)';
      if (i < hp) {
        ctx.fillStyle = '#c0304a';
        ctx.fillRect(x, y0, size, size);
      }
      ctx.strokeRect(x, y0, size, size);
    }
    ctx.fillStyle = 'rgba(200,200,220,0.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('HP', x0, y0 - 6);

    // Level + progress to next (top-right).
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(220,220,240,0.9)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('LEVEL ' + waves.level, view.w - 20, 30);
    ctx.fillStyle = 'rgba(180,180,210,0.55)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('kills ' + waves.kills, view.w - 20, 48);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(5,5,8,0.72)';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b03048';
    ctx.font = '48px system-ui, sans-serif';
    ctx.fillText('YOU DIED', view.w / 2, view.h / 2 - 24);
    ctx.fillStyle = '#9a9ab0';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('tap or press any key to restart', view.w / 2, view.h / 2 + 24);
  }

  function render() {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, view.w, view.h);

    drawGround();
    waves.draw(ctx);
    player.draw(ctx);
    Input.draw(ctx);
    drawHUD();

    if (state.mode === 'gameover') drawGameOver();

    if (DEBUG) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#2a2a3a';
      ctx.font = '12px monospace';
      ctx.fillText('t=' + state.time.toFixed(1) + 's fps=' + Math.round(state.fps) +
        ' hp=' + player.state.hp + ' [debug: X=self-damage]', 10, view.h - 10);
    }
  }

  // --- Restart input (only while in game over) ----------------------------
  function tryRestart() {
    if (state.mode === 'gameover') restart();
  }
  canvas.addEventListener('pointerdown', tryRestart);
  window.addEventListener('keydown', function (e) {
    if (state.mode === 'gameover') { tryRestart(); return; }
    // Debug-only: self-damage to exercise the health/loss flow before enemies
    // exist (T3). Enabled only with ?debug=1.
    if (DEBUG && (e.key === 'x' || e.key === 'X')) player.takeDamage(1);
  });

  // Debug/QA hook (no effect on gameplay).
  window.FTS = { state, player, waves, view, input: Input, restart,
                 hurt: (n) => player.takeDamage(n || 1) };

  // --- Loop ---------------------------------------------------------------
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
    render();
    requestAnimationFrame(frame);
  }

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
