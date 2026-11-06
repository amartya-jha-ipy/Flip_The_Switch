# Flip The Switch — Game

A side-on gothic brawler built with HTML, CSS, and JavaScript on Canvas.
See `../GDD.md` and `../GAME_BRIEF.md` for the full spec.

## Run it

No build step. Open `game/index.html` in a browser, or serve the folder:

```bash
cd game
python3 -m http.server 8000
# then open http://localhost:8000
```

## Layout

- `index.html` — page shell + canvas.
- `style.css` — dark shell, centered 16:9 canvas scaled to the viewport.
- `main.js` — entry point and fixed-timestep game loop.

## Game loop

`main.js` runs a fixed-timestep loop: the simulation updates in constant
`1/60s` steps (`update(dt)`) and rendering is interpolated per animation frame
(`render(alpha)`), so behavior is frame-rate independent. The loop pauses when
the tab is hidden.

## Status

- **T0 — scaffold:** canvas + running game loop. ✅
- Player, combat, enemies, world, and boss arrive in later milestones (T1+).
