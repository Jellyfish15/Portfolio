/* ============================================================
   MARIO PORTFOLIO — Game Engine
   ============================================================

   Controls:
     Arrow Left / A   — Move left
     Arrow Right / D  — Move right
     Space / Arrow Up / W  — Jump
     Escape           — Pause / close modal

   Touch:
     On-screen d-pad and jump button (shown on mobile)

   ============================================================ */

"use strict";

// ============================================================
// UTILITY
// ============================================================
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t) => a + (b - a) * t;

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = $("game-canvas");
const ctx    = canvas.getContext("2d");

let W = 0, H = 0;  // canvas logical dimensions (set in resize)
const PIXEL = 1;   // drawing scale (we use native px, browser scales via CSS)

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => { resize(); });
resize();

// ============================================================
// CONSTANTS
// ============================================================
const GRAVITY      = 0.55;
const JUMP_FORCE   = -14.5;
const MOVE_SPEED   = 5.5;
const GROUND_H     = 90;     // height of ground section at bottom
const BLOCK_SIZE   = 52;
const CHAR_W       = 44;
const CHAR_H       = 52;
const COIN_SIZE    = 20;
const WORLD_END_PAD= 380;    // extra space after last block

// Colours
const COL = {
  sky:       "#5c94fc",
  skyHorizon:"#87CEEB",
  groundTop: "#8B6914",
  groundMid: "#6d4c0a",
  groundDark:"#5a3c07",
  brickLine: "#000",
  cloudWhite:"#fff",
  yellow:    "#fbd000",
  yellowDark:"#c89000",
  hitBlock:  "#bc8c42",
  grassTop:  "#5dac27",
  pipeGreen: "#43a047",
  pipeEdge:  "#2e7d32",
  coinGold:  "#f7b731",
  coinDark:  "#c57800",
  flagPole:  "#fff",
  flagRed:   "#e52521",
  flagBlue:  "#049cd8",
  starColor: "#fbd000",
};

// ============================================================
// GAME STATE
// ============================================================
const STATE = { LANDING:"landing", PLAYING:"playing", MODAL:"modal", END:"end" };

let gameState = STATE.LANDING;
let cameraX   = 0;
let score     = 0;
let coinCount = 0;
let userPhoto = null; // HTMLImageElement if uploaded

// ============================================================
// INPUT
// ============================================================
const keys = {};
const touch = { left:false, right:false, jump:false };

document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "ArrowUp") e.preventDefault();
  if (e.code === "ArrowDown") e.preventDefault();
  if (e.code === "Escape" && gameState === STATE.MODAL) closeModal();
});
document.addEventListener("keyup", (e) => { keys[e.code] = false; });

// Mobile buttons
function setupMobileControls() {
  const bindBtn = (id, prop) => {
    const el = $(id);
    if (!el) return;
    const down = (e) => { e.preventDefault(); touch[prop] = true; el.classList.add("pressed"); };
    const up   = (e) => { e.preventDefault(); touch[prop] = false; el.classList.remove("pressed"); };
    el.addEventListener("touchstart", down, { passive:false });
    el.addEventListener("touchend",   up,   { passive:false });
    el.addEventListener("mousedown",  down);
    el.addEventListener("mouseup",    up);
  };
  bindBtn("ctrl-left",  "left");
  bindBtn("ctrl-right", "right");
  bindBtn("ctrl-jump",  "jump");
}

const isLeft  = () => keys["ArrowLeft"]  || keys["KeyA"] || touch.left;
const isRight = () => keys["ArrowRight"] || keys["KeyD"] || touch.right;
const isJump  = () => keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || touch.jump;

// ============================================================
// PIXEL CHARACTER DRAWING
// ============================================================
/*
  The character is drawn at pixel-art scale.
  Base grid: 11 cols × 16 rows, each cell = CHAR_W/11 × CHAR_H/16
*/
function drawChar(x, y, frame, facingRight, jumping) {
  const cw  = CHAR_W;
  const ch  = CHAR_H;
  const px  = cw / 11;
  const py  = ch / 16;

  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.translate(-cw / 2, -ch / 2);

  // Pixel art palette
  const R  = "#e52521"; // red (hat, shirt)
  const B  = "#1565c0"; // blue (overalls)
  const S  = "#fad7a0"; // skin
  const W  = "#4e342e"; // brown (shoes)
  const H  = "#3e2723"; // dark hair
  const _  = null;      // transparent
  const E  = "#fff";    // white (eyes)
  const P  = "#e91e63"; // mouth
  const G  = "#c62828"; // dark red

  // Walk frames (legs change)
  const legFrames = [
    // frame 0: neutral
    [ _,_,_,_,_,_,_,_,_,_,_,
      _,_,_,_,_,_,_,_,_,_,_,
      B,B,_,_,_,_,_,_,_,B,B,
      B,B,_,_,_,_,_,_,_,B,B,
      _,B,B,_,_,_,_,_,B,B,_,
      _,_,W,W,W,_,W,W,W,_,_ ],
    // frame 1: left forward
    [ _,_,_,_,_,_,_,_,_,_,_,
      _,_,_,_,_,_,_,_,_,_,_,
      B,B,_,_,_,_,_,_,_,_,_,
      B,B,B,_,_,_,_,_,_,_,_,
      _,B,B,B,_,_,_,B,B,B,B,
      _,_,W,W,W,_,_,_,B,W,W ],
    // frame 2: right forward
    [ _,_,_,_,_,_,_,_,_,_,_,
      _,_,_,_,_,_,_,_,_,_,_,
      _,_,_,_,_,_,_,_,_,B,B,
      _,_,_,_,_,_,_,_,B,B,B,
      B,B,B,B,_,_,_,B,B,B,_,
      W,W,B,_,_,_,W,W,W,_,_ ],
  ];

  const leg = jumping ? legFrames[0] : legFrames[frame % 3];

  // Full body grid (rows 0-9 body, rows 10-15 legs from frame)
  const body = [
    // row 0: hat
    [_,_,_,R,R,R,R,R,_,_,_],
    // row 1: hat
    [_,_,R,R,R,R,R,R,R,_,_],
    // row 2: hat with band
    [_,_,H,H,H,H,H,H,H,_,_],
    // row 3: face
    [_,S,S,S,S,S,S,S,S,S,_],
    // row 4: face with eyes
    [_,S,S,E,S,S,S,E,S,S,_],
    // row 5: face
    [_,S,S,S,S,S,S,S,S,S,_],
    // row 6: face with mouth
    [_,S,S,S,P,P,P,S,S,S,_],
    // row 7: shirt/overalls top
    [_,R,R,R,B,B,B,R,R,R,_],
    // row 8: overalls
    [R,R,R,B,B,B,B,B,R,R,R],
    // row 9: overalls
    [R,B,B,B,B,B,B,B,B,B,R],
    // rows 10-15: from leg frame
    ...leg.reduce((acc,_,i) => {
      if (i % 11 === 0) acc.push([]);
      acc[acc.length-1].push(leg[i]);
      return acc;
    }, []),
  ];

  // Draw
  for (let row = 0; row < body.length && row < 16; row++) {
    for (let col = 0; col < 11; col++) {
      const color = body[row] ? body[row][col] : null;
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(col * px), Math.round(row * py), Math.ceil(px), Math.ceil(py));
    }
  }

  // If user uploaded a photo, draw it as a small face overlay
  if (userPhoto) {
    ctx.save();
    ctx.beginPath();
    const faceX = Math.round(px);
    const faceY = Math.round(3 * py);
    const faceW = Math.round(9 * px);
    const faceH = Math.round(4 * py);
    ctx.rect(faceX, faceY, faceW, faceH);
    ctx.clip();
    ctx.drawImage(userPhoto, faceX, faceY, faceW, faceH);
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================
// WORLD GENERATION
// ============================================================
function buildWorld() {
  const groundY = H - GROUND_H;
  const blocks  = [];
  const pipes   = [];
  const coins   = [];
  const stars   = [];

  // Place question blocks based on PROJECTS array
  // Spread them across a long level with varied heights
  const levelSpacing = 340;
  const startX       = 380;

  const heightOffsets = [
    160, 200, 140, 220, 175, 195, 155, 185, 210
  ];

  PROJECTS.forEach((proj, i) => {
    const bx = startX + i * levelSpacing;
    const by = groundY - (heightOffsets[i % heightOffsets.length] || 180);
    blocks.push({
      x:       bx,
      y:       by,
      w:       BLOCK_SIZE,
      h:       BLOCK_SIZE,
      hit:     false,
      anim:    0,        // bump animation timer
      project: proj,
    });

    // Add 3 floating coins above each block (decorative)
    for (let c = 0; c < 3; c++) {
      coins.push({
        x:       bx + BLOCK_SIZE/2 - COIN_SIZE/2 + (c-1)*24,
        y:       by - 30,
        w:       COIN_SIZE, h: COIN_SIZE,
        vel:     -(6 + Math.random() * 3),
        alpha:   1,
        active:  false,  // shown only after block is hit
        collected: false,
      });
    }
  });

  // A few decorative pipes
  [[startX - 160, 80], [startX + 900, 100], [startX + 1800, 90]].forEach(([px, ph]) => {
    pipes.push({ x: px, y: groundY - ph, w: 64, h: ph });
  });

  // Background stars (fixed in world space)
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * (startX + PROJECTS.length * levelSpacing + WORLD_END_PAD),
      y: Math.random() * (H * 0.6),
      r: Math.random() < 0.3 ? 3 : 1.5,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  // World total width
  const worldW = startX + PROJECTS.length * levelSpacing + WORLD_END_PAD;

  // Castle position
  const castleX = worldW - 220;

  return { groundY, blocks, pipes, coins, stars, worldW, castleX };
}

// ============================================================
// CHARACTER OBJECT
// ============================================================
function createCharacter(groundY) {
  return {
    x:          80,
    y:          groundY - CHAR_H,
    vx:         0,
    vy:         0,
    onGround:   false,
    jumping:    false,
    facingRight:true,
    walkFrame:  0,
    walkTimer:  0,
    jumpsLeft:  1,         // allow 1 extra coyote jump
    coyoteTime: 0,
    jumpBuffer: 0,
  };
}

// ============================================================
// MAIN GAME OBJECTS (mutable, reset on new game)
// ============================================================
let world  = null;
let player = null;

function initWorld() {
  world  = buildWorld();
  player = createCharacter(world.groundY);
  cameraX   = 0;
  score     = 0;
  coinCount = 0;
}

// ============================================================
// PHYSICS & UPDATE
// ============================================================
function updatePlayer() {
  if (!player || !world) return;

  const gY = world.groundY;

  // Horizontal movement
  let moving = false;
  if (isLeft())  { player.vx = lerp(player.vx, -MOVE_SPEED, 0.25); player.facingRight = false; moving = true; }
  if (isRight()) { player.vx = lerp(player.vx, +MOVE_SPEED, 0.25); player.facingRight = true;  moving = true; }
  if (!moving)   { player.vx = lerp(player.vx, 0, 0.18); }

  // Clamp horizontal pos within world
  player.x = clamp(player.x + player.vx, 0, world.worldW - CHAR_W);

  // Gravity
  player.vy += GRAVITY;
  player.y  += player.vy;

  // Coyote time
  if (player.onGround) player.coyoteTime = 6;
  else if (player.coyoteTime > 0) player.coyoteTime--;

  // Jump buffer
  if (isJump()) player.jumpBuffer = 8;
  else if (player.jumpBuffer > 0) player.jumpBuffer--;

  // Execute jump
  if (player.jumpBuffer > 0 && (player.onGround || player.coyoteTime > 0)) {
    player.vy         = JUMP_FORCE;
    player.onGround   = false;
    player.coyoteTime = 0;
    player.jumpBuffer = 0;
    score            += 5;
  }

  // Ground collision
  player.onGround = false;
  if (player.y + CHAR_H >= gY) {
    player.y      = gY - CHAR_H;
    player.vy     = 0;
    player.onGround = true;
    player.jumping  = false;
  }
  else { player.jumping = true; }

  // Block collisions
  world.blocks.forEach((block) => {
    if (block.hit) return;
    collidePlayerBlock(player, block);
  });

  // Walk animation
  if (!player.jumping && Math.abs(player.vx) > 0.5) {
    player.walkTimer++;
    if (player.walkTimer > 7) { player.walkTimer = 0; player.walkFrame = (player.walkFrame + 1) % 3; }
  } else if (player.onGround) {
    player.walkFrame = 0;
  }
}

function collidePlayerBlock(p, block) {
  const px = p.x, py = p.y, pw = CHAR_W, ph = CHAR_H;
  const bx = block.x, by = block.y, bw = block.w, bh = block.h;

  // AABB check
  if (px + pw < bx || px > bx + bw || py + ph < by || py > by + bh) return;

  const overlapLeft  = (px + pw) - bx;
  const overlapRight = (bx + bw) - px;
  const overlapTop   = (py + ph) - by;
  const overlapBottom= (by + bh) - py;

  const minOverlapX  = Math.min(overlapLeft, overlapRight);
  const minOverlapY  = Math.min(overlapTop, overlapBottom);

  if (minOverlapY < minOverlapX) {
    if (overlapTop < overlapBottom) {
      // Player hit block from below → trigger!
      p.y  = by + bh;
      p.vy = Math.abs(p.vy) * 0.3;
      if (!block.hit) hitBlock(block);
    } else {
      // Player standing on top of block
      p.y       = by - ph;
      p.vy      = 0;
      p.onGround = true;
      p.jumping  = false;
    }
  } else {
    if (overlapLeft < overlapRight) { p.x = bx - pw; p.vx = 0; }
    else                            { p.x = bx + bw; p.vx = 0; }
  }
}

function hitBlock(block) {
  block.hit  = true;
  block.anim = 12;   // bump frames
  score     += 100;

  // Activate coins above this block
  world.coins.forEach((c) => {
    const inRange = Math.abs(c.x - (block.x + BLOCK_SIZE/2)) < BLOCK_SIZE;
    if (inRange && !c.active) {
      c.active = true;
      c.vel    = -(7 + Math.random() * 3);
      coinCount++;
      score   += 50;
    }
  });

  // Show project modal
  showModal(block.project);
}

// ============================================================
// CAMERA
// ============================================================
function updateCamera() {
  if (!player || !world) return;
  const targetX = player.x - W * 0.35;
  cameraX = lerp(cameraX, targetX, 0.1);
  cameraX = clamp(cameraX, 0, world.worldW - W);
}

// ============================================================
// COIN ANIMATION
// ============================================================
function updateCoins() {
  if (!world) return;
  world.coins.forEach((c) => {
    if (!c.active || c.collected) return;
    c.y   += c.vel;
    c.vel += GRAVITY * 0.8;
    if (c.vel > 0 && c.y > world.groundY - 40) {
      c.collected = true;
      c.alpha     = 0;
    }
    c.alpha = clamp(c.alpha - 0.02, 0, 1);
  });
}

// ============================================================
// RENDERING
// ============================================================

// --- Sky + background ---
let bgTime = 0;

function drawBackground() {
  bgTime += 0.005;

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   "#1a1a4e");
  grad.addColorStop(0.6, "#2d4a8a");
  grad.addColorStop(1,   "#5c7aaa");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Twinkling stars (fixed in screen space for BG feel)
  if (world) {
    world.stars.forEach((s) => {
      s.twinkle += 0.03;
      const brightness = 0.5 + 0.5 * Math.sin(s.twinkle);
      ctx.globalAlpha  = brightness * 0.8;
      ctx.fillStyle    = COL.starColor;
      const sx = s.x - cameraX * 0.15; // parallax
      const sy = s.y;
      if (sx > -10 && sx < W + 10) {
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  // Hills (parallax layer 1)
  drawHills();
}

function drawHills() {
  ctx.fillStyle = "#1e5c1e";
  const hillData = [
    [200, 120, 350], [600, 80, 280], [1000, 100, 320], [1400, 90, 260],
    [1800, 110, 300], [2200, 95, 270], [2600, 115, 330], [3000, 85, 250],
  ];
  hillData.forEach(([wx, ht, wr]) => {
    const sx = wx - cameraX * 0.4; // parallax
    if (sx + wr < 0 || sx - wr > W) return;
    ctx.beginPath();
    ctx.ellipse(sx, H - GROUND_H, wr, ht, 0, Math.PI, 0);
    ctx.fill();
    // Lighter top
    ctx.fillStyle = "#27ae27";
    ctx.beginPath();
    ctx.ellipse(sx, H - GROUND_H, wr * 0.8, ht * 0.6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#1e5c1e";
  });
}

// --- Clouds ---
const cloudData = (() => {
  const arr = [];
  for (let i = 0; i < 18; i++) {
    arr.push({
      x: i * 450 + Math.random() * 200,
      y: 40 + Math.random() * (H * 0.35),
      w: 100 + Math.random() * 120,
    });
  }
  return arr;
})();

function drawClouds() {
  cloudData.forEach((c) => {
    const sx = c.x - cameraX * 0.25;
    if (sx + c.w < -100 || sx > W + 100) return;
    drawCloud(sx, c.y, c.w);
  });
}

function drawCloud(x, y, w) {
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const h = w * 0.4;
  ctx.beginPath();
  ctx.ellipse(x,          y,       w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.3, y - h*0.3, w * 0.38, h * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x - w * 0.25, y - h*0.2, w * 0.32, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

// --- Ground ---
function drawGround() {
  if (!world) return;
  const gY  = world.groundY;
  const brickW = 52, brickH = 26;

  // Main fill
  const grad = ctx.createLinearGradient(0, gY, 0, H);
  grad.addColorStop(0,   COL.groundTop);
  grad.addColorStop(0.15, COL.groundMid);
  grad.addColorStop(1,   COL.groundDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, gY, W, H - gY);

  // Brick lines
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth   = 1.5;
  for (let row = 0; row * brickH < GROUND_H + 10; row++) {
    const ry = gY + row * brickH;
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(W, ry);
    ctx.stroke();
    // Vertical (offset every other row)
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col * brickW < W + brickW; col++) {
      const bx = col * brickW + ((-cameraX * 0.03) % brickW) + offset;
      ctx.beginPath();
      ctx.moveTo(bx, ry);
      ctx.lineTo(bx, ry + brickH);
      ctx.stroke();
    }
  }

  // Grass cap
  ctx.fillStyle = COL.grassTop;
  ctx.fillRect(0, gY - 8, W, 10);
  ctx.fillStyle = "#4CAF50";
  ctx.fillRect(0, gY - 4, W, 5);
}

// --- Pipes ---
function drawPipes() {
  if (!world) return;
  world.pipes.forEach((p) => {
    const sx = p.x - cameraX;
    if (sx + p.w < -20 || sx > W + 20) return;
    drawPipe(sx, p.y, p.w, p.h);
  });
}

function drawPipe(x, y, w, h) {
  // Body
  ctx.fillStyle = COL.pipeGreen;
  ctx.fillRect(x + 4, y + 16, w - 8, h - 16);
  // Edge highlight left
  ctx.fillStyle = "#66bb6a";
  ctx.fillRect(x + 4, y + 16, 8, h - 16);
  // Edge shadow right
  ctx.fillStyle = COL.pipeEdge;
  ctx.fillRect(x + w - 12, y + 16, 8, h - 16);
  // Cap
  ctx.fillStyle = COL.pipeGreen;
  ctx.fillRect(x, y, w, 16);
  // Cap highlight
  ctx.fillStyle = "#66bb6a";
  ctx.fillRect(x, y, 8, 16);
  ctx.fillRect(x, y, w, 5);
  // Cap shadow
  ctx.fillStyle = COL.pipeEdge;
  ctx.fillRect(x + w - 10, y, 10, 16);
  ctx.fillRect(x, y + 11, w, 5);
}

// --- Question Blocks ---
let qAnimTime = 0;

function drawBlocks() {
  if (!world) return;
  qAnimTime += 0.08;

  world.blocks.forEach((block) => {
    const sx = block.x - cameraX;
    if (sx + block.w < -20 || sx > W + 20) return;

    // Bump animation
    let bumpOffset = 0;
    if (block.anim > 0) {
      bumpOffset = Math.sin((12 - block.anim) / 12 * Math.PI) * -12;
      block.anim--;
    }

    const by = block.y + bumpOffset;

    if (!block.hit) {
      drawQBlock(sx, by, block.w, block.h, qAnimTime, block.project.type);
    } else {
      drawHitBlock(sx, by, block.w, block.h);
    }
  });
}

function drawQBlock(x, y, w, h, t, type) {
  const float = Math.sin(t + x * 0.01) * 3;
  y += float;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 6, y + h + 4, w, 8);

  // Block body
  const isVideo = type === "video";
  ctx.fillStyle = isVideo ? "#1565c0" : COL.yellow;
  ctx.fillRect(x, y, w, h);

  // Bevel top
  ctx.fillStyle = isVideo ? "#42a5f5" : "#ffe040";
  ctx.fillRect(x, y, w, 6);
  ctx.fillRect(x, y, 6, h);

  // Bevel bottom/right
  ctx.fillStyle = isVideo ? "#0d47a1" : COL.yellowDark;
  ctx.fillRect(x, y + h - 6, w, 6);
  ctx.fillRect(x + w - 6, y, 6, h);

  // Border
  ctx.strokeStyle = "#000";
  ctx.lineWidth   = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

  // "?" symbol
  ctx.fillStyle    = isVideo ? "#fff" : "#8b6000";
  ctx.font         = `bold ${Math.round(h * 0.55)}px 'Press Start 2P', monospace`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isVideo ? "▶" : "?", x + w / 2, y + h / 2 + 2);
  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";
}

function drawHitBlock(x, y, w, h) {
  // Dull hit block
  ctx.fillStyle = COL.hitBlock;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#a07030";
  ctx.fillRect(x, y, w, 5);
  ctx.fillRect(x, y, 5, h);
  ctx.fillStyle = "#7a5020";
  ctx.fillRect(x, y + h - 5, w, 5);
  ctx.fillRect(x + w - 5, y, 5, h);
  ctx.strokeStyle = "#000";
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

// --- Coins ---
function drawCoins() {
  if (!world) return;
  world.coins.forEach((c) => {
    if (!c.active || c.collected) return;
    const sx = c.x - cameraX;
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle   = COL.coinGold;
    ctx.beginPath();
    ctx.ellipse(sx + COIN_SIZE / 2, c.y + COIN_SIZE / 2, COIN_SIZE / 2, COIN_SIZE / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(sx + COIN_SIZE * 0.32, c.y + COIN_SIZE * 0.3, COIN_SIZE * 0.15, COIN_SIZE * 0.25, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// --- Castle (end of level) ---
function drawCastle() {
  if (!world) return;
  const gY = world.groundY;
  const cx = world.castleX - cameraX;
  if (cx + 200 < -20 || cx > W + 20) return;

  const cH = 150;
  const cW = 160;
  const cy = gY - cH;

  // Body
  ctx.fillStyle = "#8d8d8d";
  ctx.fillRect(cx, cy, cW, cH);

  // Battlements
  ctx.fillStyle = "#9e9e9e";
  const bmW = 24, bmH = 28;
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) ctx.fillRect(cx + i * (cW / 4) - bmW / 2, cy - bmH, bmW, bmH);
  }

  // Gate
  ctx.fillStyle = "#000";
  ctx.fillRect(cx + cW / 2 - 20, cy + cH - 50, 40, 50);
  // Gate arch
  ctx.beginPath();
  ctx.arc(cx + cW / 2, cy + cH - 50, 20, Math.PI, 0, false);
  ctx.fill();

  // Flag pole
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx + cW / 2 - 2, cy - 80, 4, 80);

  // Flag (waving)
  const waveT = Date.now() * 0.004;
  ctx.fillStyle = "#e52521";
  ctx.beginPath();
  ctx.moveTo(cx + cW / 2 + 2, cy - 80);
  for (let i = 0; i <= 10; i++) {
    const t  = i / 10;
    const wx = cx + cW / 2 + 2 + t * 32;
    const wy = cy - 80 + t * 18 + Math.sin(waveT + t * Math.PI) * 5;
    ctx.lineTo(wx, wy);
  }
  ctx.lineTo(cx + cW / 2 + 2, cy - 80 + 18);
  ctx.fill();

  // Window
  ctx.fillStyle = "#2196F3";
  ctx.fillRect(cx + cW / 2 - 16, cy + 20, 32, 28);
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx + cW / 2 - 2, cy + 20, 4, 28);
  ctx.fillRect(cx + cW / 2 - 16, cy + 32, 32, 4);

  // "GOAL" text
  ctx.fillStyle    = COL.yellow;
  ctx.font         = "bold 14px 'Press Start 2P', monospace";
  ctx.textAlign    = "center";
  ctx.fillText("GOAL!", cx + cW / 2, cy - 96);
  ctx.textAlign    = "left";
}

// --- HUD ---
function drawHUD() {
  const hud = $("hud");
  if (!hud) return;
  $("hud-score").textContent  = String(score).padStart(6, "0");
  $("hud-coins").textContent  = String(coinCount).padStart(2, "0");
  $("hud-world").textContent  = "WORLD 1-1";
}

// --- Character render ---
function drawPlayer() {
  if (!player) return;
  const sx = player.x - cameraX;
  drawChar(sx, player.y, player.walkFrame, player.facingRight, player.jumping);
}

// ============================================================
// END-OF-LEVEL CHECK
// ============================================================
function checkLevelEnd() {
  if (!player || !world) return;
  if (player.x >= world.castleX - 30) {
    showEndScreen();
  }
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
let lastTime = 0;

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 16.67, 3); // cap at 3 frames
  lastTime = ts;

  ctx.clearRect(0, 0, W, H);

  if (gameState === STATE.PLAYING || gameState === STATE.MODAL) {
    // Draw world
    drawBackground();
    drawClouds();
    drawGround();
    drawPipes();
    drawBlocks();
    drawCoins();
    drawCastle();
    drawPlayer();
    drawHUD();

    if (gameState === STATE.PLAYING) {
      updatePlayer();
      updateCamera();
      updateCoins();
      checkLevelEnd();
    }
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// MODAL
// ============================================================
function showModal(project) {
  gameState = STATE.MODAL;

  const overlay = $("modal-overlay");
  const modal   = $("project-modal");

  const isVideo = project.type === "video";

  const header = modal.querySelector(".modal-header");
  header.className = "modal-header" + (isVideo ? " video-header" : "");

  modal.querySelector(".modal-type-badge").textContent   = isVideo ? "▶ VIDEO" : "◆ SOFTWARE";
  modal.querySelector(".modal-title-text").textContent   = project.title;
  modal.querySelector(".modal-subtitle").textContent     = project.subtitle || "";
  modal.querySelector(".modal-description").textContent  = project.description;

  // Highlight
  const hl = modal.querySelector(".modal-highlight");
  hl.textContent = "★ " + (project.highlight || "Featured");
  hl.className   = "modal-highlight" + (isVideo ? " video-hl" : "");

  // Technologies
  const tagsEl = modal.querySelector(".tech-tags");
  tagsEl.innerHTML = "";
  (project.technologies || []).forEach((t) => {
    const span = document.createElement("span");
    span.className   = "tech-tag";
    span.textContent = t;
    tagsEl.appendChild(span);
  });

  // Meta
  const metaEl = modal.querySelector(".modal-meta");
  metaEl.innerHTML = `<div>YEAR <span>${project.year || "—"}</span></div><div>TYPE <span>${isVideo ? "VIDEO" : "SOFTWARE"}</span></div>`;

  // Links
  const linksEl = modal.querySelector(".modal-links");
  linksEl.innerHTML = "";

  if (project.github) {
    const a = document.createElement("a");
    a.href      = project.github;
    a.target    = "_blank";
    a.rel       = "noopener noreferrer";
    a.className = "modal-link-btn";
    a.textContent = "💻 GitHub";
    linksEl.appendChild(a);
  }
  if (project.live) {
    const a = document.createElement("a");
    a.href      = project.live;
    a.target    = "_blank";
    a.rel       = "noopener noreferrer";
    a.className = "modal-link-btn secondary";
    a.textContent = isVideo ? "▶ Watch" : "🌐 Live Demo";
    linksEl.appendChild(a);
  }
  if (!project.github && !project.live) {
    const span      = document.createElement("span");
    span.className  = "modal-link-btn secondary";
    span.textContent = "🔒 Private";
    linksEl.appendChild(span);
  }

  overlay.classList.add("active");
}

function closeModal() {
  $("modal-overlay").classList.remove("active");
  gameState = STATE.PLAYING;
}

// Wire modal close button — moved to BOOT section below

// ============================================================
// END SCREEN
// ============================================================
function showEndScreen() {
  if (gameState === STATE.END) return;
  gameState = STATE.END;

  const endScreen = $("end-screen");
  endScreen.classList.add("active");

  $("end-score-val").textContent  = String(score).padStart(6, "0");
  $("end-coins-val").textContent  = coinCount;
  $("end-blocks-val").textContent = world ? world.blocks.filter((b) => b.hit).length : 0;
  $("total-blocks-val").textContent = PROJECTS.length;

  // Hide HUD
  $("hud").style.display  = "none";
  $("controls-hint").style.display = "none";

  // Build social buttons
  const grid = $("social-links-grid");
  grid.innerHTML = "";
  Object.entries(SOCIAL_LINKS).forEach(([key, link], i) => {
    const a = document.createElement("a");
    a.href      = link.url;
    a.target    = "_blank";
    a.rel       = "noopener noreferrer";
    a.className = "social-btn";
    a.style.setProperty("--delay", `${i * 0.12}s`);
    a.innerHTML = `<span class="social-icon">${link.icon}</span>${link.label}`;
    grid.appendChild(a);
  });

  // Play again
  const btn = $("play-again-btn");
  if (btn) btn.addEventListener("click", () => {
    endScreen.classList.remove("active");
    initWorld();
    gameState = STATE.PLAYING;
  }, { once:true });
}

// ============================================================
// LANDING PAGE
// ============================================================
function setupLanding() {
  const screen = $("landing-screen");

  // Set personal info
  $("landing-title").textContent   = PERSONAL_INFO.tagline;
  $("landing-subtitle").textContent = PERSONAL_INFO.title;
  $("start-btn").textContent       = "▶ " + PERSONAL_INFO.cta;

  // Build starfield
  const starsEl = screen.querySelector(".stars");
  for (let i = 0; i < 100; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.cssText = `
      left: ${Math.random() * 100}%;
      top:  ${Math.random() * 100}%;
      width:  ${Math.random() < 0.2 ? 3 : 1.5}px;
      height: ${Math.random() < 0.2 ? 3 : 1.5}px;
      --dur: ${1.5 + Math.random() * 3}s;
      animation-delay: ${Math.random() * 3}s;
    `;
    starsEl.appendChild(star);
  }

  // Build clouds
  for (let i = 0; i < 5; i++) {
    const cloud = document.createElement("div");
    cloud.className = "landing-cloud";
    const w = 120 + Math.random() * 200;
    cloud.style.cssText = `
      width: ${w}px;
      height: ${w * 0.35}px;
      top:  ${10 + Math.random() * 40}%;
      left: -${w}px;
      --speed: ${25 + Math.random() * 30}s;
      animation-delay: ${Math.random() * 25}s;
    `;
    screen.appendChild(cloud);
  }

  // Draw pixel avatar on canvas
  drawLandingAvatar();

  // Photo upload
  const hint  = $("upload-hint");
  const input = $("photo-upload-input");
  if (hint && input) {
    hint.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img  = new Image();
        img.onload = () => {
          userPhoto = img;
          // Show the real photo in landing
          const photoEl = $("avatar-img");
          photoEl.src   = ev.target.result;
          photoEl.style.display = "block";
          $("avatar-pixel-canvas").style.display = "none";
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Start button
  $("start-btn").addEventListener("click", startGame);
}

function drawLandingAvatar() {
  const c   = $("avatar-pixel-canvas");
  if (!c) return;
  const sz  = c.width = c.height = 180;
  const lc  = c.getContext("2d");

  // Draw a large pixel character on the canvas
  lc.imageSmoothingEnabled = false;

  // Background circle
  const grad = lc.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
  grad.addColorStop(0,   "rgba(92,148,252,0.4)");
  grad.addColorStop(0.7, "rgba(92,148,252,0.15)");
  grad.addColorStop(1,   "transparent");
  lc.fillStyle = grad;
  lc.beginPath();
  lc.arc(sz/2, sz/2, sz/2, 0, Math.PI * 2);
  lc.fill();

  // Yellow ring
  lc.strokeStyle = "#fbd000";
  lc.lineWidth   = 4;
  lc.beginPath();
  lc.arc(sz/2, sz/2, sz/2 - 6, 0, Math.PI * 2);
  lc.stroke();

  // Draw large character (scaled up)
  const scale = 3.2;
  lc.save();
  lc.translate(sz / 2 - (CHAR_W * scale) / 2, sz / 2 - (CHAR_H * scale) / 2);
  lc.scale(scale, scale);

  // Draw a simple character using main canvas function tricks
  // We inline a simplified version here
  const px = CHAR_W / 11;
  const py = CHAR_H / 16;
  const palette = {
    R:"#e52521", B:"#1565c0", S:"#fad7a0",
    W:"#4e342e", H:"#3e2723", E:"#fff", P:"#e91e63",
  };
  const grid = [
    [null,null,null,"R","R","R","R","R",null,null,null],
    [null,null,"R","R","R","R","R","R","R",null,null],
    [null,null,"H","H","H","H","H","H","H",null,null],
    [null,"S","S","S","S","S","S","S","S","S",null],
    [null,"S","S","E","S","S","S","E","S","S",null],
    [null,"S","S","S","S","S","S","S","S","S",null],
    [null,"S","S","S","P","P","P","S","S","S",null],
    [null,"R","R","R","B","B","B","R","R","R",null],
    ["R","R","R","B","B","B","B","B","R","R","R"],
    ["R","B","B","B","B","B","B","B","B","B","R"],
    ["B","B",null,null,null,null,null,null,null,"B","B"],
    ["B","B",null,null,null,null,null,null,null,"B","B"],
    [null,"B","B","W","W","W",null,"W","W","W","B"],
    [null,null,"W","W","W",null,null,null,"W","W",null],
  ];

  grid.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (!cell) return;
      lc.fillStyle = palette[cell] || "#fff";
      lc.fillRect(ci * px, ri * py, px + 0.5, py + 0.5);
    });
  });

  lc.restore();

  // Pixel dots effect around the avatar
  lc.fillStyle = "rgba(251,208,0,0.7)";
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dist  = sz / 2 - 4;
    lc.beginPath();
    lc.arc(sz/2 + Math.cos(angle) * dist, sz/2 + Math.sin(angle) * dist, 3, 0, Math.PI * 2);
    lc.fill();
  }
}

// ============================================================
// START GAME
// ============================================================
function startGame() {
  const landing = $("landing-screen");
  landing.classList.add("fade-out");

  setTimeout(() => {
    landing.style.display = "none";

    const gameScreen = $("game-screen");
    gameScreen.style.display = "block";

    const hud = $("hud");
    hud.style.display = "flex";

    $("controls-hint").style.display = "block";

    initWorld();
    gameState = STATE.PLAYING;

    requestAnimationFrame(gameLoop);
  }, 800);
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Wire modal close
  const closeBtn = $("modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  const overlay = $("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  setupMobileControls();
  setupLanding();
  // Game loop is started by startGame(), not on boot
});
