import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

const TILE_SIZE = 64;
const SPEED = 5;
const INTERACTION_RADIUS = 150; // Matches backend clustering

function CosmosWorld({ players, selfId, onMove, partners = [], onReady }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const worldRef = useRef(null); // Reference for the world container
  const graphicsRef = useRef(null); // Reference for the single players graphics object
  const labelsRef = useRef(new Map()); // Map to store text labels

  const keys = useRef({});
  const [isReady, setIsReady] = useState(false);

  // Sync props to refs to avoid closure issues in ticker
  const propsRef = useRef({ players, selfId, partners, onMove });
  useEffect(() => {
    propsRef.current = { players, selfId, partners, onMove };
  }, [players, selfId, partners, onMove]);

  useEffect(() => {
    const init = async () => {
      const app = new PIXI.Application();
      await app.init({
        resizeTo: window,
        backgroundColor: 0x050505,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (containerRef.current) containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // World Container (holds everything that moves with camera)
      const world = new PIXI.Container();
      app.stage.addChild(world);
      worldRef.current = world;

      // Grid
      const grid = new PIXI.Graphics();
      world.addChild(grid);

      // Lines layer
      const lines = new PIXI.Graphics();
      world.addChild(lines);

      // Players layer (One graphics for all circles)
      const g = new PIXI.Graphics();
      world.addChild(g);
      graphicsRef.current = g;

      // Labels layer
      const labelsContainer = new PIXI.Container();
      world.addChild(labelsContainer);

      const ticker = () => update(app, world, grid, lines, g, labelsContainer);
      app.ticker.add(ticker);

      setIsReady(true);
      onReady && onReady();
    };

    init();

    const down = (e) => (keys.current[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true);
    const up = (e) => (keys.current[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      if (appRef.current) appRef.current.destroy(true, { children: true });
    };
  }, []);

  const lastPos = useRef({ x: 400, y: 400 });
  const initialized = useRef(false);
  const lastEmit = useRef(0);
  const mouseTarget = useRef(null);
  const starsRef = useRef(null); // Reference for static stars graphics

  const update = (app, world, grid, lines, g, labelsContainer) => {
    const { players: playersMap, selfId, partners = [], onMove } = propsRef.current;
    if (!selfId || !playersMap) return;

    // 0. Sync Initial Position from Server
    if (!initialized.current) {
      const me = playersMap.get(selfId);
      if (me) {
        lastPos.current = { x: me.x, y: me.y };
        initialized.current = true;
      } else {
        return; // Wait for self to be in map
      }
    }

    // 0. Initialize Stars (One time)
    if (!starsRef.current) {
      const stars = new PIXI.Graphics();
      for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 10000;
        const y = (Math.random() - 0.5) * 10000;
        const size = Math.random() * 2;
        const alpha = Math.random() * 0.7 + 0.3;
        stars.circle(x, y, size).fill({ color: 0xffffff, alpha });
      }
      world.addChildAt(stars, 0); // Put behind grid
      starsRef.current = stars;
    }

    // 1. Calculate Movement
    let dx = 0, dy = 0;
    
    // Keyboard Input (Standard 2D movement)
    if (keys.current.w || keys.current.ArrowUp) dy -= SPEED;
    if (keys.current.s || keys.current.ArrowDown) dy += SPEED;
    if (keys.current.a || keys.current.ArrowLeft) dx -= SPEED;
    if (keys.current.d || keys.current.ArrowRight) dx += SPEED;

    // Mouse Input (Walk towards click)
    if (mouseTarget.current) {
      const screenX = mouseTarget.current.x;
      const screenY = mouseTarget.current.y;
      
      const targetWorldX = (screenX - app.screen.width / 2) + lastPos.current.x;
      const targetWorldY = (screenY - app.screen.height / 2) + lastPos.current.y;
      
      const angle = Math.atan2(targetWorldY - lastPos.current.y, targetWorldX - lastPos.current.x);
      const dist = Math.sqrt(Math.pow(targetWorldX - lastPos.current.x, 2) + Math.pow(targetWorldY - lastPos.current.y, 2));
      
      if (dist > 10) {
        dx = Math.cos(angle) * SPEED;
        dy = Math.sin(angle) * SPEED;
      }
    }

    lastPos.current.x += dx;
    lastPos.current.y += dy;

    if (dx !== 0 || dy !== 0) {
      const now = Date.now();
      if (now - lastEmit.current > 40) {
        onMove && onMove(lastPos.current.x, lastPos.current.y);
        lastEmit.current = now;
      }
    }

    // Camera follow
    app.stage.pivot.set(lastPos.current.x, lastPos.current.y);
    app.stage.position.set(app.screen.width / 2, app.screen.height / 2);

    // 2. Draw Grid (Static world lines)
    grid.clear();
    const sX = Math.floor((lastPos.current.x - app.screen.width) / TILE_SIZE) * TILE_SIZE;
    const eX = lastPos.current.x + app.screen.width;
    const sY = Math.floor((lastPos.current.y - app.screen.height) / TILE_SIZE) * TILE_SIZE;
    const eY = lastPos.current.y + app.screen.height;

    grid.stroke({ width: 1, color: 0xffffff, alpha: 0.1 }); // More visible cosmic grid
    for (let x = sX; x < eX; x += TILE_SIZE) { grid.moveTo(x, sY).lineTo(x, eY); }
    for (let y = sY; y < eY; y += TILE_SIZE) { grid.moveTo(sX, y).lineTo(eX, y); }

    // 3. Draw All Players
    g.clear();
    lines.clear();

    const time = Date.now() / 1000;

    playersMap.forEach((p, id) => {
      const isMe = id === selfId;
      const px = isMe ? lastPos.current.x : p.x;
      const py = isMe ? lastPos.current.y : p.y;

      // Draw Interaction Aura
      g.circle(px, py, INTERACTION_RADIUS)
        .fill({ color: 0x6366F1, alpha: 0.15 }) // Indigo Blue
        .stroke({ width: 2, color: 0x6366F1, alpha: 0.3 });

      // Core Avatar Body
      g.circle(px, py, 26)
        .fill(0x111111) // Slightly lighter than background for contrast
        .stroke({ width: 5, color: isMe ? 0xA855F7 : 0xffffff });
      
      // Inner Glow
      g.circle(px, py, 18)
        .fill({ color: isMe ? 0xA855F7 : 0xffffff, alpha: 0.4 });

      // Handle Text Labels
      if (!labelsRef.current.has(id)) {
        const txt = new PIXI.Text({
          text: p.name,
          style: { fontFamily: 'Outfit', fontSize: 13, fill: 0xffffff, fontWeight: '900', letterSpacing: 1, stroke: { width: 3, color: 0x000000 } }
        });
        txt.anchor.set(0.5);
        labelsContainer.addChild(txt);
        labelsRef.current.set(id, txt);
      }
      const label = labelsRef.current.get(id);
      label.x = px;
      label.y = py - 65;
      label.alpha = 0.8;
      label.visible = true;
    });

    // High-Contrast Global Proximity Lines with ZERO-LAG for local player
    const playerEntries = Array.from(playersMap.entries());
    const selfX = lastPos.current.x; // High-frequency local pos
    const selfY = lastPos.current.y;

    for (let i = 0; i < playerEntries.length; i++) {
      for (let j = i + 1; j < playerEntries.length; j++) {
        const [id1, p1] = playerEntries[i];
        const [id2, p2] = playerEntries[j];
        
        // Anchor to real-time coordinates for self to eliminate visual drift
        const x1 = (id1 === selfId) ? selfX : p1.x;
        const y1 = (id1 === selfId) ? selfY : p1.y;
        const x2 = (id2 === selfId) ? selfX : p2.x;
        const y2 = (id2 === selfId) ? selfY : p2.y;

        const dist = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        
        // High-Contrast pulsing line with smooth fade-out (140px-160px window)
        if (dist < INTERACTION_RADIUS + 10) {
           const baseAlpha = 0.6 + Math.sin(time * 5) * 0.2;
           const fadeFactor = Math.max(0, Math.min(1, (INTERACTION_RADIUS + 10 - dist) / 20));
           const alpha = baseAlpha * fadeFactor;
           
           if (alpha > 0.02) {
             lines.moveTo(x1, y1)
                  .lineTo(x2, y2)
                  .stroke({ width: 3, color: 0xA855F7, alpha });
           }
        }
      }
    }

    // Clean up old labels
    labelsRef.current.forEach((txt, id) => {
      if (!playersMap.has(id)) {
        labelsContainer.removeChild(txt);
        labelsRef.current.delete(id);
      }
    });
  };

  const handlePointer = (e) => {
    if (e.buttons === 1) { // Left click held
      mouseTarget.current = { x: e.clientX, y: e.clientY };
    } else {
      mouseTarget.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-crosshair overflow-hidden"
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
      onPointerUp={() => mouseTarget.current = null}
    />
  );
}

export default CosmosWorld;
