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

  const state = { time: 0, fps: 0, mode: 'playing', // 'playing' | 'gameover'
                  lastLevel: 1, lastZone: null, banner: null };

  // --- Entities -----------------------------------------------------------
  if (typeof Assets !== 'undefined') Assets.init();
  Input.init(canvas);
  const world = createWorld(view);
  const player = createPlayer(view);
  const waves = createWaveManager(view, player);
  state.lastZone = world.zoneName(1);

  function restart() {
    player.reset();
    waves.reset();
    world.reset();
    state.mode = 'playing';
    state.time = 0;
    state.lastLevel = 1;
    state.lastZone = world.zoneName(1);
    state.banner = null;
  }

  function update(dt) {
    state.time += dt;
    if (state.banner) { state.banner.t -= dt; if (state.banner.t <= 0) state.banner = null; }
    if (state.mode === 'playing') {
      world.update(dt);
      player.update(dt);
      waves.update(dt);

      // Level-up / zone-change banners (readability).
      if (waves.level !== state.lastLevel) {
        state.lastLevel = waves.level;
        const zn = world.zoneName(waves.level);
        if (zn !== state.lastZone) {
          state.lastZone = zn;
          state.banner = { text: 'ENTERING ' + zn.toUpperCase(), t: 2.2 };
        } else {
          state.banner = { text: 'LEVEL ' + waves.level, t: 1.5 };
        }
      }
      // Player's active punch damages overlapping enemies (once per attack).
      waves.applyPlayerAttack(player.activeHitbox());
      // Endless: there is deliberately NO win condition. The only end state
      // is loss when health reaches 0.
      if (!player.state.alive) state.mode = 'gameover';
    }
  }

  // --- Rendering ----------------------------------------------------------
  function drawHUD() {
    if (typeof Assets !== 'undefined' && Assets.drawHUD) {
      Assets.drawHUD(ctx, view, player, waves, world);
      return;
    }

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
    // Current zone name.
    ctx.fillStyle = 'rgba(150,150,180,0.5)';
    ctx.fillText(waves.bossActive ? "Ogre's Lair" : world.zoneName(waves.level), view.w - 20, 64);

    // Boss health bar (top-center) during an ogre fight.
    if (waves.bossActive && waves.boss) {
      const b = waves.boss;
      const bw = view.w * 0.5, bh = 14, bxc = (view.w - bw) / 2, byc = 74;
      const frac = Math.max(0, b.hp / b.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bxc - 2, byc - 2, bw + 4, bh + 4);
      ctx.fillStyle = '#7a1020';
      ctx.fillRect(bxc, byc, bw, bh);
      ctx.fillStyle = '#d83048';
      ctx.fillRect(bxc, byc, bw * frac, bh);
      ctx.strokeStyle = 'rgba(220,160,170,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bxc, byc, bw, bh);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(230,200,210,0.9)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('ONE-EYED OGRE', view.w / 2, byc - 6);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(8, 6, 12, 0.85)';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(200, 30, 50, 0.9)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#d82848';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('YOU DIED', view.w / 2, view.h / 2 - 24);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#c5bed2';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('TAP OR PRESS ANY KEY TO RESTART', view.w / 2, view.h / 2 + 28);
  }

  function render() {
    // Parallax world (zone by level) or the enclosed boss arena.
    world.draw(ctx, waves.level, waves.bossActive);

    waves.draw(ctx);
    player.draw(ctx);
    Input.draw(ctx);
    drawHUD();

    // Hurt vignette: red edges flash when the player takes damage.
    if (player.state.hurtTimer > 0 && player.state.alive) {
      const a = Math.min(0.5, player.state.hurtTimer) * 0.8;
      const vg = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.35, view.w / 2, view.h / 2, view.h * 0.72);
      vg.addColorStop(0, 'rgba(180,20,30,0)');
      vg.addColorStop(1, 'rgba(180,20,30,' + a.toFixed(3) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, view.w, view.h);
    }

    // Transient banner (level up / zone change).
    if (state.banner) {
      const b = state.banner;
      ctx.globalAlpha = Math.min(1, b.t * 1.5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(230,220,235,0.95)';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(b.text, view.w / 2, view.h * 0.28);
      ctx.globalAlpha = 1;
    }

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
  window.FTS = { state, player, waves, world, view, input: Input, restart,
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
