/*
 * Flip The Switch — Visual Assets & Sprite Rendering Engine
 * Handles loading of hand-painted comic-book dark fantasy assets,
 * animated sprite frames, parallax environment, and combat VFX.
 */
'use strict';

const Assets = (function () {
  const images = {};
  let loadedCount = 0;
  let totalCount = 0;
  let isReady = false;

  const MANIFEST = {
    // Characters
    player: 'assets/characters/player.png',
    skeleton_unarmed: 'assets/characters/skeleton_unarmed.png',
    skeleton_sword: 'assets/characters/skeleton_sword.png',
    skeleton_sword_shield: 'assets/characters/skeleton_sword_shield.png',
    zombie_normal: 'assets/characters/zombie_normal.png',
    zombie_blast: 'assets/characters/zombie_blast.png',
    bat: 'assets/characters/bat.png',
    ogre: 'assets/characters/ogre.png',
    // Backgrounds
    sky: 'assets/backgrounds/sky.png',
    moon: 'assets/backgrounds/moon.png',
    cathedral_spires: 'assets/backgrounds/cathedral_spires.png',
    graveyard_mid: 'assets/backgrounds/graveyard_mid.png',
    ground_cobblestone: 'assets/backgrounds/ground_cobblestone.png',
    boss_arena: 'assets/backgrounds/boss_arena.png',
    // UI & VFX
    heart_full: 'assets/ui/heart_full.png',
    heart_empty: 'assets/ui/heart_empty.png',
    vfx_slash_straight: 'assets/ui/vfx_slash_straight.png',
    vfx_slash_uppercut: 'assets/ui/vfx_slash_uppercut.png',
    vfx_telegraph_ring: 'assets/ui/vfx_telegraph_ring.png',
    joystick_base: 'assets/ui/joystick_base.png',
    joystick_knob: 'assets/ui/joystick_knob.png',
    button_jab: 'assets/ui/button_jab.png',
    button_up: 'assets/ui/button_up.png',
  };

  function init(onComplete) {
    if (Object.keys(images).length > 0) {
      if (isReady && onComplete) onComplete();
      return;
    }
    const keys = Object.keys(MANIFEST);
    totalCount = keys.length;
    loadedCount = 0;

    keys.forEach((key) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= totalCount) {
          isReady = true;
          if (onComplete) onComplete();
        }
      };
      img.onerror = () => {
        console.warn(`[Assets] Failed to load asset: ${MANIFEST[key]}`);
        loadedCount++;
        if (loadedCount >= totalCount) {
          isReady = true;
          if (onComplete) onComplete();
        }
      };
      img.src = MANIFEST[key];
      images[key] = img;
    });
  }

  function get(key) {
    return images[key] || null;
  }

  // --- Ambient Floating Particles (fireflies, mist motes, embers) ---
  const particles = [];
  for (let i = 0; i < 35; i++) {
    particles.push({
      x: Math.random() * 960,
      y: 120 + Math.random() * 340,
      vx: (Math.random() - 0.5) * 18 - 8,
      vy: (Math.random() - 0.5) * 12,
      r: 1.2 + Math.random() * 2.2,
      alpha: 0.2 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.phase += dt * 2;
      if (p.x < -10) p.x = 970;
      if (p.x > 970) p.x = -10;
      if (p.y < 100) p.y = 460;
      if (p.y > 470) p.y = 110;
    }
  }

  function drawParticles(ctx, isBoss) {
    ctx.save();
    for (const p of particles) {
      const pulse = 0.5 + 0.5 * Math.sin(p.phase);
      const a = p.alpha * pulse;
      ctx.fillStyle = isBoss ? `rgba(255,140,50,${a.toFixed(3)})` : `rgba(160,210,240,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGroundShadow(ctx, x, y, width, alpha) {
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, 0.28);
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, width);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, width, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Helper to wrap seamless parallax horizontal offset
  function wrapped(offset, tile) {
    return -((offset % tile) + tile) % tile;
  }

  // -------------------------------------------------------------------------
  // Background Rendering
  // -------------------------------------------------------------------------
  function drawBackground(ctx, view, scrollX, level, bossActive) {
    updateParticles(1 / 60);

    if (bossActive) {
      // Enclosed Boss Arena
      const arenaImg = get('boss_arena');
      if (arenaImg && arenaImg.complete && arenaImg.naturalWidth > 0) {
        ctx.drawImage(arenaImg, 0, 0, view.w, view.h);
      } else {
        ctx.fillStyle = '#100a12';
        ctx.fillRect(0, 0, view.w, view.h);
      }
      drawParticles(ctx, true);
      return;
    }

    // Normal Scrolling World
    const skyImg = get('sky');
    const moonImg = get('moon');
    const spiresImg = get('cathedral_spires');
    const midImg = get('graveyard_mid');
    const groundImg = get('ground_cobblestone');

    const GROUND_Y = view.h - 90;

    // 1. Sky
    if (skyImg && skyImg.complete && skyImg.naturalWidth > 0) {
      ctx.drawImage(skyImg, 0, 0, view.w, GROUND_Y);
    } else {
      ctx.fillStyle = '#141829';
      ctx.fillRect(0, 0, view.w, GROUND_Y);
    }

    // 2. Moon (Slow drift)
    if (moonImg && moonImg.complete && moonImg.naturalWidth > 0) {
      const moonX = wrapped(scrollX * 0.04, view.w * 1.5) + view.w * 0.65;
      ctx.drawImage(moonImg, moonX, 35, 140, 140);
    }

    // 3. Distant Cathedral & Dark Forest Spires (Parallax factor 0.18)
    if (spiresImg && spiresImg.complete && spiresImg.naturalWidth > 0) {
      const spTile = view.w;
      const spOff = wrapped(scrollX * 0.18, spTile);
      for (let x = spOff - spTile; x < view.w + spTile; x += spTile) {
        ctx.drawImage(spiresImg, x, GROUND_Y - 240, view.w, 240);
      }
    }

    // 4. Midground Gothic Graveyard Arch, Lanterns & Fences (Parallax factor 0.42)
    if (midImg && midImg.complete && midImg.naturalWidth > 0) {
      const midTile = view.w;
      const midOff = wrapped(scrollX * 0.42, midTile);
      for (let x = midOff - midTile; x < view.w + midTile; x += midTile) {
        ctx.drawImage(midImg, x, GROUND_Y - 210, view.w, 210);
      }
    }

    // 5. Cobblestone Ground (Tile along ground plane)
    if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) {
      const grTile = view.w;
      const grOff = wrapped(scrollX * 1.0, grTile);
      for (let x = grOff - grTile; x < view.w + grTile; x += grTile) {
        ctx.drawImage(groundImg, x, GROUND_Y, view.w, view.h - GROUND_Y);
      }
    } else {
      ctx.fillStyle = '#1a1822';
      ctx.fillRect(0, GROUND_Y, view.w, view.h - GROUND_Y);
    }

    // 6. Ambient Floating Particles
    drawParticles(ctx, false);
  }

  // -------------------------------------------------------------------------
  // Player Rendering
  // -------------------------------------------------------------------------
  function drawPlayer(ctx, p, animTime) {
    const img = get('player');
    const fw = 140, fh = 140;
    const spriteScale = 1.2;
    const cx = p.x;
    const cy = p.y; // baseline at feet

    drawGroundShadow(ctx, cx, cy, 34, 0.62);
    ctx.save();
    // Facing direction flip
    ctx.translate(cx, cy);
    ctx.scale(p.facing, 1);

    // Hit flash
    const flashing = p.hurtTimer > 0 && Math.floor(p.hurtTimer * 20) % 2 === 0;
    if (flashing) {
      ctx.filter = 'brightness(2.2) sepia(1) hue-rotate(300deg)';
    }

    let col = 0, row = 0;

    if (!p.alive) {
      // Dead
      row = 0; col = 5;
    } else if (p.hurtTimer > 0.3) {
      // Hurt reaction
      row = 0; col = 4;
    } else if (p.attack) {
      // Attack state
      const atk = p.attack;
      const progress = atk.t / atk.dur;
      if (atk.type === 'straight') {
        row = 2;
        col = progress < 0.25 ? 0 : (progress < 0.7 ? 1 : 2);
      } else {
        // uppercut
        row = 2;
        col = progress < 0.25 ? 3 : (progress < 0.7 ? 4 : 5);
      }
    } else {
      // Movement / Idle
      const moving = Math.abs(Input.move.x) > 0.1 || Math.abs(Input.move.y) > 0.1;
      if (moving) {
        row = 1;
        col = Math.floor(animTime * 10) % 6;
      } else {
        row = 0;
        col = Math.floor(animTime * 4) % 4;
      }
    }

    if (img && img.complete && img.naturalWidth > 0) {
      // Anchor sprite: horizontally centered on feet, bottom aligned at cy - 18
      const sx = col * fw;
      const sy = row * fh;
      ctx.shadowColor = 'rgba(8, 8, 18, 0.9)';
      ctx.shadowBlur = 3;
      ctx.drawImage(img, sx, sy, fw, fh,
        -fw * spriteScale / 2, -fh * spriteScale + 18,
        fw * spriteScale, fh * spriteScale);
    } else {
      // Fallback
      ctx.fillStyle = p.alive ? '#12121a' : '#221111';
      ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Enemy Rendering (Skeletons & Zombies)
  // -------------------------------------------------------------------------
  function drawEnemy(ctx, e, animTime) {
    const fw = 120, fh = 120;
    const spriteScale = 1.16;
    const cx = e.x;
    const cy = e.y;
    const imgKey = e.type;
    const img = get(imgKey);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(e.facing, 1);

    // Flashes
    if (e.hitFlash > 0) {
      ctx.filter = 'brightness(2.5) saturate(1.8)';
    }

    let col = 0;
    const dying = e.state === 'dying' || e.state === 'dead';
    const isWindup = e.state === 'windup';
    const isFuse = e.state === 'fuse';

    drawGroundShadow(ctx, cx, cy, Math.max(26, e.w * 1.05), 0.5);
    if (dying) {
      col = 7;
    } else if (isFuse) {
      col = 6;
    } else if (isWindup) {
      col = 5;
    } else {
      // Shambling / walking
      col = Math.floor(animTime * 6) % 4;
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const sx = col * fw;
      ctx.shadowColor = 'rgba(5, 6, 14, 0.95)';
      ctx.shadowBlur = 3;
      ctx.drawImage(img, sx, 0, fw, fh,
        -fw * spriteScale / 2, -fh * spriteScale + 16,
        fw * spriteScale, fh * spriteScale);
    } else {
      ctx.fillStyle = e.cfg ? e.cfg.color : '#222';
      ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
    }

    ctx.restore();

    // Blast zombie ground warning decal during fuse
    if (isFuse) {
      const ringImg = get('vfx_telegraph_ring');
      const danger = 1 - Math.max(0, e.fuseT) / (e.cfg.fuseMax || 2.0);
      const rad = e.cfg.blastRadius || 62;
      ctx.save();
      ctx.translate(e.x, e.y - 10);
      ctx.scale(1, 0.45); // flatten to ground plane
      const pulse = 1.0 + 0.1 * Math.sin(animTime * 20);
      const sz = rad * 2 * pulse;
      if (ringImg && ringImg.complete) {
        ctx.globalAlpha = 0.6 + 0.4 * danger;
        ctx.drawImage(ringImg, -sz / 2, -sz / 2, sz, sz);
      } else {
        ctx.strokeStyle = `rgba(255, 60, 30, ${0.4 + 0.5 * danger})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, rad * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Mini health bar if wounded
    if (e.hp < e.maxHp && !dying && !isFuse) {
      const bw = e.w + 10, bh = 5;
      const frac = Math.max(0, e.hp / e.maxHp);
      ctx.save();
      ctx.fillStyle = 'rgba(10, 8, 14, 0.75)';
      ctx.fillRect(e.x - bw / 2 - 1, e.y - e.h - 12, bw + 2, bh + 2);
      ctx.fillStyle = '#b82a3a';
      ctx.fillRect(e.x - bw / 2, e.y - e.h - 11, bw * frac, bh);
      ctx.strokeStyle = 'rgba(210, 180, 140, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(e.x - bw / 2 - 1, e.y - e.h - 12, bw + 2, bh + 2);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Bat Rendering
  // -------------------------------------------------------------------------
  function drawBat(ctx, b, animTime) {
    const img = get('bat');
    const fw = 80, fh = 64;

    drawGroundShadow(ctx, b.x, b.y + 26, 24, 0.35);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.facing, 1);

    if (b.hitFlash > 0) {
      ctx.filter = 'brightness(2.5)';
    }

    let col = 0;
    if (b.state === 'swoop') {
      col = 4 + (Math.floor(animTime * 12) % 2);
    } else {
      col = Math.floor(animTime * 8) % 4;
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(18, 8, 32, 0.9)';
      ctx.shadowBlur = 3;
      ctx.drawImage(img, col * fw, 0, fw, fh,
        -fw * 0.58, -fh * 0.58, fw * 1.16, fh * 1.16);
    } else {
      ctx.fillStyle = '#331a33';
      ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swoop indicator underline
    if (b.state === 'swoop') {
      ctx.strokeStyle = 'rgba(220, 140, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 16);
      ctx.lineTo(16, 16);
      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // One-Eyed Ogre Boss Rendering
  // -------------------------------------------------------------------------
  function drawOgre(ctx, o, animTime) {
    const img = get('ogre');
    const fw = 220, fh = 200;
    const spriteScale = 1.12;

    // 1. Attack telegraphs on the ground/air
    if (o.state === 'windup' || o.state === 'active') {
      const a = o.cfg.attacks[o.attack];
      if (o.attack === 'ground_slam') {
        const ringImg = get('vfx_telegraph_ring');
        const sz = (a.radius || 150) * 2;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.scale(1, 0.42);
        if (ringImg && ringImg.complete) {
          ctx.globalAlpha = o.state === 'active' ? 0.9 : 0.55;
          ctx.drawImage(ringImg, -sz / 2, -sz / 2, sz, sz);
        }
        ctx.restore();
      } else if (o.attack === 'laser_eyes') {
        // Eye Laser Beam
        const eyeY = o.y - 124;
        const reach = a.reach || 620;
        const dir = o.facing;
        const x0 = o.x + dir * 18;
        const x1 = dir > 0 ? x0 + reach : x0 - reach;

        ctx.save();
        // Searing core beam
        const bAlpha = o.state === 'active' ? 0.95 : 0.35;
        const bWidth = o.state === 'active' ? 14 : 4;
        ctx.strokeStyle = `rgba(255, 60, 30, ${bAlpha})`;
        ctx.lineWidth = bWidth;
        ctx.beginPath();
        ctx.moveTo(x0, eyeY);
        ctx.lineTo(x1, eyeY);
        ctx.stroke();
        // Bright hot-white center core
        if (o.state === 'active') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x0, eyeY);
          ctx.lineTo(x1, eyeY);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Club sweep / long reach telegraph arc with comic warning styling
        ctx.save();
        const r = a.reach || 160;
        const dir = o.facing;
        const startX = o.x;
        const endX = o.x + dir * r;
        const on = o.state === 'active';
        const hg = ctx.createLinearGradient(startX, 0, endX, 0);
        hg.addColorStop(0, on ? 'rgba(255, 60, 40, 0.65)' : 'rgba(220, 50, 40, 0.28)');
        hg.addColorStop(1, 'rgba(255, 120, 50, 0.05)');
        ctx.fillStyle = hg;
        ctx.fillRect(dir > 0 ? startX : endX, o.y - 45, r, 45);
        ctx.strokeStyle = on ? 'rgba(255, 180, 50, 0.95)' : 'rgba(220, 80, 50, 0.6)';
        ctx.lineWidth = on ? 2.5 : 1.5;
        ctx.strokeRect(dir > 0 ? startX : endX, o.y - 45, r, 45);
        ctx.restore();
      }
    }

    // 2. Boss Sprite
    drawGroundShadow(ctx, o.x, o.y, 78, 0.75);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(o.facing, 1);

    if (o.hitFlash > 0) {
      ctx.filter = 'brightness(2.2)';
    }

    let col = 0;
    if (o.state === 'dying' || o.state === 'dead') {
      col = 7;
    } else if (o.state === 'windup' || o.state === 'active') {
      if (o.attack === 'laser_eyes') col = 5;
      else if (o.attack === 'ground_slam') col = 6;
      else col = 3;
    } else {
      col = Math.floor(animTime * 4) % 3;
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(7, 5, 12, 0.95)';
      ctx.shadowBlur = 5;
      ctx.drawImage(img, col * fw, 0, fw, fh,
        -fw * spriteScale / 2, -fh * spriteScale + 20,
        fw * spriteScale, fh * spriteScale);
    } else {
      ctx.fillStyle = '#401824';
      ctx.fillRect(-o.w / 2, -o.h, o.w, o.h);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Combat Attack Slash VFX
  // -------------------------------------------------------------------------
  function drawAttackVFX(ctx, hb) {
    if (!hb) return;
    const isStraight = hb.type === 'straight';
    const imgKey = isStraight ? 'vfx_slash_straight' : 'vfx_slash_uppercut';
    const img = get(imgKey);

    ctx.save();
    ctx.translate(hb.x, hb.y);
    ctx.scale(hb.facing, 1);
    if (hb.angle) ctx.rotate(hb.angle);

    if (img && img.complete && img.naturalWidth > 0) {
      const sw = hb.w * 1.5;
      const sh = hb.h * 1.5;
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    } else {
      ctx.fillStyle = isStraight ? 'rgba(140,220,255,0.6)' : 'rgba(210,130,255,0.6)';
      ctx.fillRect(-hb.w / 2, -hb.h / 2, hb.w, hb.h);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // UI & HUD Rendering
  // -------------------------------------------------------------------------
  function drawHUD(ctx, view, player, waves, world) {
    const hFull = get('heart_full');
    const hEmpty = get('heart_empty');
    const hp = player.state.hp;
    const max = player.state.maxHp;

    // 1. Health indicators (top-left)
    const x0 = 24, y0 = 24, size = 30, gap = 8;
    for (let i = 0; i < max; i++) {
      const x = x0 + i * (size + gap);
      const img = i < hp ? hFull : hEmpty;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y0, size, size);
      } else {
        ctx.fillStyle = i < hp ? '#c0304a' : '#2a2228';
        ctx.fillRect(x, y0, size, size);
      }
    }

    // 2. Level & Kill counters (top-right)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';

    // Gothic decorative badge banner text
    ctx.fillStyle = 'rgba(240, 230, 215, 0.95)';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('LEVEL ' + waves.level, view.w - 24, 34);

    ctx.fillStyle = 'rgba(215, 175, 90, 0.85)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('KILLS: ' + waves.kills, view.w - 24, 52);

    ctx.fillStyle = 'rgba(170, 185, 215, 0.65)';
    ctx.font = 'italic 13px system-ui, sans-serif';
    ctx.fillText(waves.bossActive ? "Ogre's Lair" : world.zoneName(waves.level), view.w - 24, 70);
    ctx.restore();

    // 3. Boss Health Bar (top-center during fight)
    if (waves.bossActive && waves.boss) {
      const b = waves.boss;
      const bw = view.w * 0.52, bh = 18;
      const bx = (view.w - bw) / 2, by = 60;
      const frac = Math.max(0, b.hp / b.maxHp);

      ctx.save();
      // Outer gothic frame
      ctx.fillStyle = 'rgba(12, 10, 16, 0.85)';
      ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
      ctx.strokeStyle = '#d4aa50';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - 4, by - 4, bw + 8, bh + 8);

      // Deep blood bar
      ctx.fillStyle = '#4a0d18';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#c82842';
      ctx.fillRect(bx, by, bw * frac, bh);

      // Title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f5e8d0';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText('ONE-EYED OGRE', view.w / 2, by - 8);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Virtual Touch Controls Rendering
  // -------------------------------------------------------------------------
  function drawControls(ctx, joy, joyKnob, btnStraight, btnUpper, pressedStraight, pressedUpper) {
    const jBaseImg = get('joystick_base');
    const jKnobImg = get('joystick_knob');
    const bJabImg = get('button_jab');
    const bUpImg = get('button_up');

    // Joystick Base
    if (jBaseImg && jBaseImg.complete) {
      const sz = joy.radius * 2;
      ctx.drawImage(jBaseImg, joy.cx - sz / 2, joy.cy - sz / 2, sz, sz);
    }
    // Joystick Knob
    if (jKnobImg && jKnobImg.complete) {
      const sz = joy.knob * 2;
      ctx.drawImage(jKnobImg, joyKnob.x - sz / 2, joyKnob.y - sz / 2, sz, sz);
    }

    // Button Straight (JAB)
    if (bJabImg && bJabImg.complete) {
      const sz = btnStraight.r * 2;
      ctx.save();
      if (pressedStraight) ctx.filter = 'brightness(1.5)';
      ctx.drawImage(bJabImg, btnStraight.cx - sz / 2, btnStraight.cy - sz / 2, sz, sz);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JAB', btnStraight.cx, btnStraight.cy);
      ctx.restore();
    }

    // Button Uppercut (UP)
    if (bUpImg && bUpImg.complete) {
      const sz = btnUpper.r * 2;
      ctx.save();
      if (pressedUpper) ctx.filter = 'brightness(1.5)';
      ctx.drawImage(bUpImg, btnUpper.cx - sz / 2, btnUpper.cy - sz / 2, sz, sz);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('UP', btnUpper.cx, btnUpper.cy);
      ctx.restore();
    }
  }

  return {
    init,
    drawBackground,
    drawPlayer,
    drawEnemy,
    drawBat,
    drawOgre,
    drawAttackVFX,
    drawHUD,
    drawControls,
    get isReady() { return isReady; },
  };
})();

if (typeof window !== 'undefined') {
  window.Assets = Assets;
  Assets.init();
}
if (typeof globalThis !== 'undefined') globalThis.Assets = Assets;
