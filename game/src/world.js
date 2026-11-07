/*
 * World (T9) — gothic parallax backdrop, zone progression, and boss arena.
 *
 * Normal play: a horizontally scrolling, side-on world with three parallax
 * layers (far moonlit sky/fog → mid tombstones/trees/ruins → near ground).
 * The zone advances with the player's level (Graveyard → Catacombs/Crypt →
 * Ruined Village → deeper ruins), each darker/more oppressive.
 *
 * Boss fight: the view cuts to a distinct enclosed ogre-lair arena (no scroll),
 * so the framing itself signals the isolated 1v1.
 */
'use strict';

function createWorld(view) {
  const GROUND_Y = view.h - 90;

  // Zone palettes, each darker than the last.
  const ZONES = [
    { name: 'Graveyard',      skyTop: '#121626', skyBot: '#20273a', mid: '#0d1018', ground: '#0c0f16', accent: '#39425c', moon: 0.9 },
    { name: 'Catacombs',      skyTop: '#0d0b16', skyBot: '#181324', mid: '#0a0812', ground: '#0a0812', accent: '#332a44', moon: 0.6 },
    { name: 'Ruined Village', skyTop: '#0a0a12', skyBot: '#12101a', mid: '#08070d', ground: '#08080d', accent: '#2a2430', moon: 0.4 },
    { name: 'Deeper Ruins',   skyTop: '#060609', skyBot: '#0c0a12', mid: '#050507', ground: '#050508', accent: '#1f1b28', moon: 0.25 },
  ];

  const w = {
    scrollX: 0,
    speed: 46,          // backdrop drift (sense of travel)
    zoneCount: ZONES.length,
  };

  // Zone advances every 3 levels, clamped to the last.
  w.zoneForLevel = (level) => Math.min(ZONES.length - 1, Math.max(0, Math.floor((level - 1) / 3)));

  w.update = function (dt) { w.scrollX += w.speed * dt; };
  w.reset = function () { w.scrollX = 0; };

  // --- Helpers ----------------------------------------------------------
  function wrapped(offset, tile) {
    return -((offset % tile) + tile) % tile;
  }

  function drawTombstones(ctx, z, baseY, tile, speed, color) {
    const off = wrapped(w.scrollX * speed, tile);
    ctx.fillStyle = color;
    for (let x = off - tile; x < view.w + tile; x += tile) {
      // a rounded headstone
      ctx.beginPath();
      ctx.moveTo(x + 10, baseY);
      ctx.lineTo(x + 10, baseY - 34);
      ctx.arc(x + 22, baseY - 34, 12, Math.PI, 0);
      ctx.lineTo(x + 34, baseY);
      ctx.closePath();
      ctx.fill();
      // a dead tree a bit further along
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      const tx = x + tile * 0.62;
      ctx.beginPath();
      ctx.moveTo(tx, baseY);
      ctx.lineTo(tx, baseY - 46);
      ctx.moveTo(tx, baseY - 30); ctx.lineTo(tx + 12, baseY - 40);
      ctx.moveTo(tx, baseY - 36); ctx.lineTo(tx - 11, baseY - 46);
      ctx.stroke();
    }
  }

  function drawZone(ctx, zi) {
    const z = ZONES[zi];
    // Sky gradient.
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, z.skyTop);
    g.addColorStop(1, z.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, GROUND_Y);

    // Far: moon + drifting fog (slow parallax).
    const moonX = wrapped(w.scrollX * 0.04, view.w * 2) + view.w * 0.72;
    ctx.globalAlpha = z.moon;
    ctx.fillStyle = '#c9cfe0';
    ctx.beginPath(); ctx.arc(moonX, 90, 34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Fog bands.
    ctx.fillStyle = 'rgba(150,160,190,0.05)';
    const fogTile = view.w;
    const fo = wrapped(w.scrollX * 0.1, fogTile);
    for (let x = fo - fogTile; x < view.w + fogTile; x += fogTile) {
      ctx.beginPath();
      ctx.ellipse(x + fogTile * 0.4, GROUND_Y - 150, 220, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mid: tombstones / trees / ruins silhouettes (medium parallax).
    drawTombstones(ctx, z, GROUND_Y - 4, 180, 0.4, z.mid);
    // a touch of accent ruins behind
    drawTombstones(ctx, z, GROUND_Y - 2, 260, 0.25, z.accent);

    // Ground plane.
    ctx.fillStyle = z.ground;
    ctx.fillRect(0, GROUND_Y, view.w, view.h - GROUND_Y);
    ctx.strokeStyle = z.accent;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(view.w, GROUND_Y); ctx.stroke();
  }

  function drawBossArena(ctx) {
    // Enclosed, static ogre-lair: dark stone, side walls, braziers.
    ctx.fillStyle = '#0a0709';
    ctx.fillRect(0, 0, view.w, GROUND_Y);
    // Back wall gradient.
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#0f0a0c');
    g.addColorStop(1, '#1a1012');
    ctx.fillStyle = g;
    ctx.fillRect(40, 30, view.w - 80, GROUND_Y - 30);
    // Side walls (the enclosure).
    ctx.fillStyle = '#060405';
    ctx.fillRect(0, 0, 44, view.h);
    ctx.fillRect(view.w - 44, 0, 44, view.h);
    // Stone blocks on the walls.
    ctx.strokeStyle = 'rgba(80,60,64,0.5)';
    ctx.lineWidth = 2;
    for (let y = 20; y < view.h; y += 40) {
      ctx.strokeRect(6, y, 32, 34);
      ctx.strokeRect(view.w - 38, y, 32, 34);
    }
    // Braziers with glow.
    for (const bx of [80, view.w - 80]) {
      const by = GROUND_Y - 150;
      const rg = ctx.createRadialGradient(bx, by, 4, bx, by, 60);
      rg.addColorStop(0, 'rgba(255,140,50,0.5)');
      rg.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(bx, by, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a3a';
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    }
    // Floor.
    ctx.fillStyle = '#120c0e';
    ctx.fillRect(0, GROUND_Y, view.w, view.h - GROUND_Y);
    ctx.strokeStyle = '#3a2a2e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(view.w, GROUND_Y); ctx.stroke();
  }

  w.draw = function (ctx, level, bossActive) {
    if (typeof Assets !== 'undefined' && Assets.drawBackground) {
      Assets.drawBackground(ctx, view, w.scrollX, level, bossActive);
    } else {
      if (bossActive) drawBossArena(ctx);
      else drawZone(ctx, w.zoneForLevel(level));
    }
  };

  w.zoneName = (level) => ZONES[w.zoneForLevel(level)].name;

  return w;
}
