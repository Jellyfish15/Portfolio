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
const lerp = (a, b, t) => a + (b - a) * t;

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = $("game-canvas");
const ctx = canvas.getContext("2d");

let W = 0,
  H = 0; // canvas logical dimensions (set in resize)
let mobileOffsetY = 0; // vertical shift on mobile portrait so character is fully visible
const PIXEL = 1; // drawing scale (we use native px, browser scales via CSS)

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;

  // On mobile portrait, shift the viewport up so the character and
  // ground section are visible (not hidden at the very bottom).
  const isPortrait = H > W && W < 768;
  if (isPortrait) {
    const charTopY = H - 90 - 52; // logical y of character head (GROUND_H=90, CHAR_H=52)
    const targetY = H * 0.55; // where we want the head to sit on screen
    mobileOffsetY = Math.max(0, Math.round(charTopY - targetY));
  } else {
    mobileOffsetY = 0;
  }
}
window.addEventListener("resize", () => {
  const oldHeight = H;
  resize();
  if (world) {
    const shift = H - oldHeight;
    world.groundY += shift;
    player.y += shift;
    [...world.blocks, ...world.pipes, ...world.coins].forEach(item => item.y += shift);
    updateCamera();
  }
});
resize();

// ============================================================
// CONSTANTS
// ============================================================
const GRAVITY = 0.55;
const JUMP_FORCE = -14.5;
const MOVE_SPEED = 5.5;
const GROUND_H = 90; // height of ground section at bottom
const BLOCK_SIZE = 52;
const CHAR_W = 44;
const CHAR_H = 52;
const COIN_SIZE = 20;
const CASTLE_GAP = 180; // clear path after the final project block

// Colours
const COL = {
  sky: "#5c94fc",
  skyHorizon: "#87CEEB",
  groundTop: "#8B6914",
  groundMid: "#6d4c0a",
  groundDark: "#5a3c07",
  brickLine: "#000",
  cloudWhite: "#fff",
  yellow: "#fbd000",
  yellowDark: "#c89000",
  hitBlock: "#bc8c42",
  grassTop: "#5dac27",
  pipeGreen: "#43a047",
  pipeEdge: "#2e7d32",
  coinGold: "#f7b731",
  coinDark: "#c57800",
  flagPole: "#fff",
  flagRed: "#e52521",
  flagBlue: "#049cd8",
  starColor: "#fbd000",
};

// ============================================================
// GAME STATE
// ============================================================
const STATE = {
  LANDING: "landing",
  PLAYING: "playing",
  MODAL: "modal",
  PAUSED: "paused",
  END: "end",
};

let gameState = STATE.LANDING;
let cameraX = 0;
let score = 0;
let coinCount = 0;
let userPhoto = null; // HTMLImageElement if uploaded

// ============================================================
// INPUT
// ============================================================
const keys = {};
const touch = { left: false, right: false, jump: false };
let jumpHeld = false;
function clearInput() {
  Object.keys(keys).forEach(key => keys[key] = false);
  Object.keys(touch).forEach(key => touch[key] = false);
  document.querySelectorAll(".ctrl-btn").forEach(el => el.classList.remove("pressed"));
  jumpHeld = false;
  if (player) player.jumpBuffer = 0;
}
function pauseGame() {
  clearInput();
  if (gameState === STATE.PLAYING) gameState = STATE.PAUSED;
  resetClock();
}
window.addEventListener("blur", pauseGame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame();
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !e.repeat) {
    if ($("resume-overlay").classList.contains("active")) closeResume();
    else if (gameState === STATE.MODAL) closeModal();
    else if (gameState === STATE.PLAYING) pauseGame();
    else if (gameState === STATE.PAUSED) { gameState = STATE.PLAYING; resetClock(); }
    return;
  }
  if (gameState !== STATE.PLAYING) return;
  keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Mobile buttons
function setupMobileControls() {
  const bindBtn = (id, prop) => {
    const el = $(id);
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      if (gameState === STATE.PAUSED) { gameState = STATE.PLAYING; resetClock(); }
      if (gameState !== STATE.PLAYING) return;
      el.setPointerCapture(e.pointerId);
      touch[prop] = true;
      el.classList.add("pressed");
    };
    const up = (e) => {
      e.preventDefault();
      touch[prop] = false;
      el.classList.remove("pressed");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
  };
  bindBtn("ctrl-left", "left");
  bindBtn("ctrl-right", "right");
  bindBtn("ctrl-jump", "jump");
}

const isLeft = () => keys["ArrowLeft"] || keys["KeyA"] || touch.left;
const isRight = () => keys["ArrowRight"] || keys["KeyD"] || touch.right;
const isJump = () =>
  keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || touch.jump;

// ============================================================
// PIXEL CHARACTER DRAWING
// ============================================================
/*
  The character is drawn at pixel-art scale.
  Base grid: 11 cols × 16 rows, each cell = CHAR_W/11 × CHAR_H/16
*/
function drawChar(x, y, frame, facingRight, jumping) {
  const cw = CHAR_W;
  const ch = CHAR_H;
  const px = cw / 11;
  const py = ch / 16;

  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.translate(-cw / 2, -ch / 2);

  // Pixel art palette
  const LB = "#9bbede"; // light blue (shirt)
  const DB = "#7a9fc2"; // darker blue (shirt shadow)
  const DN = "#2c3e50"; // dark navy (pants)
  const S = "#f5d0b0"; // fair skin
  const W = "#5d4037"; // brown (shoes)
  const H = "#3b2314"; // dark brown hair
  const M = "#4a2c0f"; // mustache (dark brown)
  const _ = null; // transparent
  const E = "#fff"; // white (eyes)
  const Ep = "#4a3728"; // brown eye pupils
  const P = "#d4857a"; // mouth/lips

  // --- Limb swing angle (smooth sine wave) ---
  const phase = player ? player.limbPhase || 0 : 0;
  const maxSwing = jumping ? 0.12 : 0.78; // radians
  const swing = Math.sin(phase) * maxSwing;

  // Helper: draw connected two-segment limb from a pivot point
  function drawLeg(
    pivotX,
    pivotY,
    angle,
    upperLen,
    lowerLen,
    upperCol,
    lowerCol,
    thick,
  ) {
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);
    // Upper segment
    ctx.fillStyle = upperCol;
    ctx.beginPath();
    ctx.roundRect(-thick / 2, 0, thick, upperLen, thick / 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, thick * 0.36, 0, Math.PI * 2);
    ctx.fill();
    // Lower segment with slight knee/elbow bend
    ctx.translate(0, upperLen);
    ctx.rotate(Math.abs(angle) * 0.35);
    ctx.fillStyle = lowerCol;
    ctx.beginPath();
    ctx.roundRect(-thick / 2, 0, thick, lowerLen, thick / 3);
    ctx.fill();
    ctx.restore();
  }

  // Arm rig: shoulders stay anchored while forearms sweep inward/outward.
  function drawArm(
    shoulderX,
    shoulderY,
    phaseOffset,
    upperCol,
    handCol,
    thick,
  ) {
    const sideSign = shoulderX < cw / 2 ? -1 : 1;
    const armWave = Math.sin(phase + phaseOffset) * maxSwing;
    const upperLen = py * 2.1;
    const lowerLen = py * 1.9;

    // Base pose angles arms slightly inward toward torso center.
    const shoulderAngle = sideSign * 0.22 + armWave * 0.95;
    const elbowAngle = sideSign * 0.34 + armWave * 0.38;

    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(shoulderAngle);

    // Upper arm + shoulder joint
    ctx.fillStyle = upperCol;
    ctx.beginPath();
    ctx.roundRect(-thick / 2, 0, thick, upperLen, thick / 2.8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, thick * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Elbow + forearm sweeps across the body when phase flips.
    ctx.translate(0, upperLen);
    ctx.rotate(elbowAngle);
    ctx.fillStyle = handCol;
    ctx.beginPath();
    ctx.roundRect(-thick / 2, 0, thick, lowerLen, thick / 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, thick * 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const armThick = px * 1.8;
  const upperArmLen = py * 2.0;
  const forearmLen = py * 1.8;
  const legThick = px * 2.0;
  const upperLegLen = py * 2.0;
  const lowerLegLen = py * 2.0;

  const shoulderLX = cw * 0.12;
  const shoulderRX = cw * 0.82;
  const shoulderY = py * 8.5;
  const hipLX = cw * 0.3;
  const hipRX = cw * 0.62;
  const hipY = py * 12;

  // --- Draw BACK arm & leg (behind body) ---
  drawArm(shoulderLX, shoulderY, 0, LB, S, armThick);
  drawLeg(hipLX, hipY, swing, upperLegLen, lowerLegLen, DN, W, legThick);

  // --- Body grid (12 rows: stocky Mario-like proportions) ---
  const body = [
    // row 0: top of hair
    [_, _, _, H, H, H, H, H, _, _, _],
    // row 1: hair full width
    [_, _, H, H, H, H, H, H, H, _, _],
    // row 2: hair + forehead
    [_, H, H, H, S, S, S, H, H, H, _],
    // row 3: face with hair sides
    [H, H, S, S, S, S, S, S, S, H, H],
    // row 4: eyes (brown pupils on white)
    [H, H, S, E, Ep, S, Ep, E, S, H, H],
    // row 5: nose / cheeks
    [H, H, S, S, S, S, S, S, S, H, H],
    // row 6: mustache
    [H, H, S, M, M, M, M, M, S, H, H],
    // row 7: mouth / chin
    [_, H, S, S, P, P, P, S, S, H, _],
    // row 8: shirt shoulders (skin = visible hands at sides)
    [_, S, LB, LB, LB, LB, LB, LB, LB, S, _],
    // row 9: wide shirt torso (stocky Mario build)
    [S, LB, LB, LB, DB, LB, DB, LB, LB, LB, S],
    // row 10: shirt / belt line
    [_, LB, DN, DN, DN, DN, DN, DN, DN, LB, _],
    // row 11: pants waist
    [_, _, DN, DN, DN, _, DN, DN, DN, _, _],
  ];

  for (let row = 0; row < body.length; row++) {
    for (let col = 0; col < 11; col++) {
      const color = body[row][col];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(col * px),
        Math.round(row * py),
        Math.ceil(px),
        Math.ceil(py),
      );
    }
  }

  // --- Draw FRONT leg & arm (in front of body) ---
  drawLeg(hipRX, hipY, -swing, upperLegLen, lowerLegLen, DN, W, legThick);
  drawArm(shoulderRX, shoulderY, Math.PI, LB, S, armThick);

  // If user uploaded a photo, draw it as a small face overlay
  if (userPhoto) {
    ctx.save();
    ctx.beginPath();
    const faceX = Math.round(px);
    const faceY = Math.round(3 * py);
    const faceW = Math.round(9 * px);
    const faceH = Math.round(5 * py);
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
  const blocks = [];
  const pipes = [];
  const coins = [];
  const stars = [];

  // Place question blocks based on PROJECTS array
  // Spread them across a long level with varied heights
  const levelSpacing = 340;
  const startX = 380;

  const heightOffsets = [160, 200, 140, 220, 175, 195, 155, 185, 210];

  PROJECTS.forEach((proj, i) => {
    const bx = startX + i * levelSpacing;
    const by = groundY - (heightOffsets[i % heightOffsets.length] || 180);
    blocks.push({
      x: bx,
      y: by,
      w: BLOCK_SIZE,
      h: BLOCK_SIZE,
      hit: false,
      anim: 0, // bump animation timer
      project: proj,
    });

    // Add 3 floating coins above each block (decorative)
    for (let c = 0; c < 3; c++) {
      coins.push({
        x: bx + BLOCK_SIZE / 2 - COIN_SIZE / 2 + (c - 1) * 24,
        y: by - 30,
        w: COIN_SIZE,
        h: COIN_SIZE,
        vel: -(6 + Math.random() * 3),
        alpha: 1,
        active: false, // shown only after block is hit
        collected: false,
      });
    }
  });

  const lastBlock = blocks[blocks.length - 1];
  const castleX = (lastBlock ? lastBlock.x + lastBlock.w : startX) + CASTLE_GAP;
  const worldW = castleX + 220;

  // A few decorative pipes
  [
    [startX - 160, 80],
    [startX + 900, 100],
    [startX + 1800, 90],
  ].forEach(([px, ph]) => {
    if (px + 64 < (lastBlock ? lastBlock.x : castleX)) {
      pipes.push({ x: px, y: groundY - ph, w: 64, h: ph });
    }
  });

  // Background stars (fixed in world space)
  for (let i = 0; i < 60; i++) {
    stars.push({
      x:
        Math.random() * worldW,
      y: Math.random() * (H * 0.6),
      r: Math.random() < 0.3 ? 3 : 1.5,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  return { groundY, blocks, pipes, coins, stars, worldW, castleX };
}

// ============================================================
// CHARACTER OBJECT
// ============================================================
function createCharacter(groundY) {
  return {
    x: 80,
    y: groundY - CHAR_H,
    vx: 0,
    vy: 0,
    onGround: false,
    jumping: false,
    facingRight: true,
    walkFrame: 0,
    walkTimer: 0,
    limbPhase: 0,
    coyoteTime: 0,
    jumpBuffer: 0,
  };
}

// ============================================================
// MAIN GAME OBJECTS (mutable, reset on new game)
// ============================================================
let world = null;
let player = null;

function initWorld() {
  clearInput();
  resetClock();
  world = buildWorld();
  player = createCharacter(world.groundY);
  cameraX = 0;
  score = 0;
  coinCount = 0;
  bgTime = 0;
  qAnimTime = 0;
  initBgFlyers();
}

// ============================================================
// PHYSICS & UPDATE
// ============================================================
function updatePlayer() {
  if (!player || !world) return;

  const gY = world.groundY;

  // Horizontal movement
  let moving = false;
  if (isLeft()) {
    player.vx = lerp(player.vx, -MOVE_SPEED, 0.25);
    player.facingRight = false;
    moving = true;
  }
  if (isRight()) {
    player.vx = lerp(player.vx, +MOVE_SPEED, 0.25);
    player.facingRight = true;
    moving = true;
  }
  if (!moving) {
    player.vx = lerp(player.vx, 0, 0.18);
  }

  // Clamp horizontal pos within world
  player.x = clamp(player.x + player.vx, 0, world.worldW - CHAR_W);

  // Coyote time
  if (player.onGround) player.coyoteTime = 6;
  else if (player.coyoteTime > 0) player.coyoteTime--;

  // Jump buffer
  const jumpPressed = !!isJump();
  if (jumpPressed && !jumpHeld) player.jumpBuffer = 8;
  else if (player.jumpBuffer > 0) player.jumpBuffer--;

  jumpHeld = jumpPressed;

  // Execute jump
  if (player.jumpBuffer > 0 && (player.onGround || player.coyoteTime > 0)) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    player.coyoteTime = 0;
    player.jumpBuffer = 0;
    score += 5;
  }

  // Apply takeoff before integration so a supporting block cannot cancel it.
  player.vy += GRAVITY;
  player.y += player.vy;

  // Ground collision (skip snap when moving upward, e.g. just jumped)
  player.onGround = false;
  if (player.y + CHAR_H >= gY && player.vy >= 0) {
    player.y = gY - CHAR_H;
    player.vy = 0;
    player.onGround = true;
    player.jumping = false;
  } else {
    player.jumping = true;
  }

  // Block collisions (blocks remain solid even after being hit)
  world.blocks.forEach((block) => {
    collidePlayerBlock(player, block);
  });

  // Walk animation
  if (!player.jumping && Math.abs(player.vx) > 0.5) {
    player.walkTimer++;
    if (player.walkTimer > 7) {
      player.walkTimer = 0;
      player.walkFrame = (player.walkFrame + 1) % 3;
    }
    // Smooth limb swing — speed scales with movement
    player.limbPhase += Math.abs(player.vx) * 0.18;
  } else if (player.onGround) {
    player.walkFrame = 0;
    // Ease limb phase back to neutral
    player.limbPhase += (Math.round(player.limbPhase / Math.PI) * Math.PI - player.limbPhase) * 0.2;
  }
}

function collidePlayerBlock(p, block) {
  const px = p.x,
    py = p.y,
    pw = CHAR_W,
    ph = CHAR_H;
  const bx = block.x,
    by = block.y,
    bw = block.w,
    bh = block.h;

  // AABB check
  if (px + pw <= bx || px >= bx + bw || py + ph <= by || py >= by + bh) return;

  const overlapLeft = px + pw - bx;
  const overlapRight = bx + bw - px;
  const overlapTop = py + ph - by;
  const overlapBottom = by + bh - py;

  const minOverlapX = Math.min(overlapLeft, overlapRight);
  const minOverlapY = Math.min(overlapTop, overlapBottom);

  if (minOverlapY < minOverlapX) {
    if (overlapTop < overlapBottom) {
      // Only downward motion can land on the top surface.
      if (p.vy < 0) return;
      p.y = by - ph;
      p.vy = 0;
      p.onGround = true;
      p.jumping = false;
    } else {
      // Player hit block from below → trigger modal/project
      p.y = by + bh;
      p.vy = Math.abs(p.vy) * 0.3;
      if (!block.hit) hitBlock(block);
    }
  } else {
    if (overlapLeft < overlapRight) {
      p.x = bx - pw;
      p.vx = 0;
    } else {
      p.x = bx + bw;
      p.vx = 0;
    }
  }
}

function hitBlock(block) {
  block.hit = true;
  block.anim = 12; // bump frames
  score += 100;

  // Activate coins above this block
  world.coins.forEach((c) => {
    const inRange = Math.abs(c.x - (block.x + BLOCK_SIZE / 2)) < BLOCK_SIZE;
    if (inRange && !c.active) {
      c.active = true;
      c.vel = -(7 + Math.random() * 3);
      coinCount++;
      score += 50;
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
  cameraX = clamp(cameraX, 0, Math.max(0, world.worldW - W));
}

// ============================================================
// COIN ANIMATION
// ============================================================
function updateCoins() {
  if (!world) return;
  world.coins.forEach((c) => {
    if (!c.active || c.collected) return;
    c.y += c.vel;
    c.vel += GRAVITY * 0.8;
    if (c.vel > 0 && c.y > world.groundY - 40) {
      c.collected = true;
      c.alpha = 0;
    }
    c.alpha = clamp(c.alpha - 0.02, 0, 1);
  });
}

// ============================================================
// RENDERING
// ============================================================

// --- Sky + background ---
let bgTime = 0;

// --- Background flying objects ---
const bgBirds = [];
const bgTurtles = [];
const bgPlanes = [];
const BACKGROUND_INTERVAL = 40 * 60; // one of each every 40 seconds of play
const BACKGROUND_LIFETIME = 22 * 60;
let backgroundTick = 0;
const nextBackgroundSpawn = { bird: 0, plane: 8 * 60, turtle: 16 * 60 };

function initBgFlyers() {
  bgBirds.length = 0;
  bgTurtles.length = 0;
  bgPlanes.length = 0;
  backgroundTick = 0;
  nextBackgroundSpawn.bird = 0;
  nextBackgroundSpawn.plane = 8 * 60;
  nextBackgroundSpawn.turtle = 16 * 60;
}

function updateBgFlyers() {
  if (backgroundTick >= nextBackgroundSpawn.bird) {
    bgBirds.push({ x: cameraX * 0.2 + 24, y: 50 + H * 0.08,
      speed: 0.25, dir: 1, wingPhase: 0, age: 0 });
    nextBackgroundSpawn.bird += BACKGROUND_INTERVAL;
  }
  if (backgroundTick >= nextBackgroundSpawn.plane) {
    bgPlanes.push({ x: cameraX * 0.2 - 60, y: 50 + H * 0.16,
      speed: 0.65, age: 0 });
    nextBackgroundSpawn.plane += BACKGROUND_INTERVAL;
  }
  if (backgroundTick >= nextBackgroundSpawn.turtle) {
    bgTurtles.push({ x: cameraX * 0.15 + W * 0.75, speed: 0.12,
      dir: -1, walkPhase: 0, age: 0 });
    nextBackgroundSpawn.turtle += BACKGROUND_INTERVAL;
  }
  backgroundTick++;
  for (const group of [bgBirds, bgPlanes, bgTurtles]) {
    for (let i = group.length - 1; i >= 0; i--) {
      const actor = group[i];
      actor.x += actor.speed * (actor.dir || 1);
      actor.age++;
      if (actor.wingPhase !== undefined) actor.wingPhase += 0.04;
      if (actor.walkPhase !== undefined) actor.walkPhase += 0.02;
      if (actor.age >= BACKGROUND_LIFETIME) group.splice(i, 1);
    }
  }
}

function backgroundOpacity(actor) {
  // Fade in/out gently; actors never wrap back into the scene.
  return Math.min(1, actor.age / 120, (BACKGROUND_LIFETIME - actor.age) / 120);
}

function drawPixelTurtle(x, y, walkPhase, dir) {
  const s = 3;
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);

  const legBob = Math.sin(walkPhase) * 1.5;

  // Legs (behind shell)
  ctx.fillStyle = "#3a6028";
  ctx.fillRect(-s * 3, -s * 2 + legBob, s * 2, s * 2); // back legs
  ctx.fillRect(-s, -s * 2 - legBob, s * 2, s * 2);
  ctx.fillRect(s, -s * 2 - legBob, s * 2, s * 2); // front legs
  ctx.fillRect(s * 3, -s * 2 + legBob, s * 2, s * 2);

  // Shell base
  ctx.fillStyle = "#4a7a3a";
  ctx.fillRect(-s * 4, -s * 5, s * 8, s * 3);
  // Shell dome
  ctx.fillStyle = "#5a9a4a";
  ctx.fillRect(-s * 3, -s * 7, s * 6, s * 2);
  ctx.fillRect(-s * 2, -s * 8, s * 4, s);
  // Shell highlight
  ctx.fillStyle = "#6ab85a";
  ctx.fillRect(-s * 2, -s * 7, s * 2, s);
  // Shell ridges
  ctx.fillStyle = "#3a6a2a";
  ctx.fillRect(-s, -s * 7, 2, s * 3);
  ctx.fillRect(s, -s * 7, 2, s * 3);

  // Head
  ctx.fillStyle = "#5a8040";
  ctx.fillRect(s * 4, -s * 5, s * 3, s * 2);
  // Eye
  ctx.fillStyle = "#111";
  ctx.fillRect(s * 6, -s * 5, 3, 3);

  // Tail
  ctx.fillStyle = "#4a7030";
  ctx.fillRect(-s * 5, -s * 4, s * 2, s);

  ctx.restore();
}

function drawBgTurtles() {
  if (!world) return;
  const parallax = 0.15;
  const groundY = H - GROUND_H;
  bgTurtles.forEach((t) => {
    ctx.globalAlpha = 0.72 * backgroundOpacity(t);
    const sx = t.x - cameraX * parallax;
    if (sx > -60 && sx < W + 60) {
      drawPixelTurtle(sx, groundY, t.walkPhase, t.dir);
    }
  });
  ctx.globalAlpha = 1;
}

function drawPixelBird(x, y, wingPhase, dir) {
  const s = 4; // bigger pixel scale
  const wing = Math.sin(wingPhase);
  const flip = dir < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);

  // Body (dark brown)
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(0, 0, s * 4, s);
  ctx.fillRect(s, -s, s * 2, s);
  // Belly (lighter)
  ctx.fillStyle = "#6b5040";
  ctx.fillRect(s, s, s * 2, s);
  // Head
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(s * 4, -s, s, s * 2);
  // Eye
  ctx.fillStyle = "#fff";
  ctx.fillRect(s * 4, -s, s, s);
  ctx.fillStyle = "#000";
  ctx.fillRect(s * 4 + s * 0.4, -s + s * 0.2, s * 0.5, s * 0.5);
  // Beak
  ctx.fillStyle = "#e8a020";
  ctx.fillRect(s * 5, 0, s, s);
  // Tail
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(-s, -s, s, s);
  ctx.fillRect(-s * 2, -s * 2, s, s);
  // Wings (animated)
  const wingY = wing * s * 3;
  ctx.fillStyle = "#4a3828";
  ctx.fillRect(s, -s * 2 + wingY, s * 3, s);
  ctx.fillRect(s * 2, -s * 3 + wingY, s * 2, s);

  ctx.restore();
}

function drawPixelPlane(x, y) {
  const s = 4; // bigger pixels
  ctx.save();
  ctx.translate(x, y);

  // --- Green biplane inspired by reference ---
  // Fuselage (main body)
  ctx.fillStyle = "#4acd4a";
  ctx.fillRect(-s * 5, -s, s * 10, s * 3);
  // Fuselage highlight
  ctx.fillStyle = "#6de86d";
  ctx.fillRect(-s * 4, -s, s * 8, s);
  // Fuselage dark underside
  ctx.fillStyle = "#2a8a2a";
  ctx.fillRect(-s * 4, s, s * 8, s);

  // Upper wing
  ctx.fillStyle = "#3bba3b";
  ctx.fillRect(-s * 7, -s * 4, s * 14, s * 2);
  ctx.fillStyle = "#5ad65a";
  ctx.fillRect(-s * 6, -s * 4, s * 12, s);
  // Upper wing tips
  ctx.fillStyle = "#c8ff50";
  ctx.fillRect(s * 6, -s * 4, s * 2, s * 2);
  ctx.fillRect(-s * 8, -s * 3, s, s);

  // Lower wing
  ctx.fillStyle = "#80e880";
  ctx.fillRect(-s * 6, s * 2, s * 12, s * 2);
  ctx.fillStyle = "#a0f0a0";
  ctx.fillRect(-s * 5, s * 2, s * 10, s);

  // Wing struts
  ctx.fillStyle = "#2a6a2a";
  ctx.fillRect(-s * 3, -s * 2, s, s);
  ctx.fillRect(s * 3, -s * 2, s, s);

  // Cockpit
  ctx.fillStyle = "#fff";
  ctx.fillRect(-s, -s * 2, s * 3, s);
  ctx.fillStyle = "#88bbdd";
  ctx.fillRect(-s, -s * 2, s * 2, s);
  // Cockpit frame
  ctx.fillStyle = "#222";
  ctx.fillRect(-s * 2, -s * 2, s, s);
  ctx.fillRect(s * 2, -s * 2, s, s);

  // Nose cone
  ctx.fillStyle = "#2a8a2a";
  ctx.fillRect(s * 5, -s, s * 2, s * 2);
  ctx.fillStyle = "#1e6e1e";
  ctx.fillRect(s * 6, 0, s, s);

  // Tail fin (vertical)
  ctx.fillStyle = "#3bba3b";
  ctx.fillRect(-s * 6, -s * 3, s * 2, s * 2);
  ctx.fillStyle = "#4acd4a";
  ctx.fillRect(-s * 7, -s * 4, s * 2, s);
  // Tail fin (horizontal)
  ctx.fillRect(-s * 7, s, s * 3, s);

  // Propeller (spinning)
  ctx.fillStyle = "#bbed50";
  const propSpin = bgTime * 300;
  const pLen = Math.sin(propSpin) * s * 4;
  ctx.fillRect(s * 7, -Math.abs(pLen), s, Math.abs(pLen) * 2 || s);
  // Second blade (90 degrees offset)
  const pLen2 = Math.cos(propSpin) * s * 4;
  ctx.fillRect(s * 7, -Math.abs(pLen2), s, Math.abs(pLen2) * 2 || s);
  // Hub
  ctx.fillStyle = "#444";
  ctx.fillRect(s * 7, -s * 0.5, s, s);

  // Outline accents
  ctx.fillStyle = "#1a5a1a";
  ctx.fillRect(-s * 5, s * 2, s * 10, s * 0.5);

  ctx.restore();
}

function drawBgFlyers() {
  bgBirds.forEach((bird) => {
    const x = bird.x - cameraX * 0.2;
    ctx.globalAlpha = backgroundOpacity(bird);
    if (x > -40 && x < W + 40) drawPixelBird(x, bird.y, bird.wingPhase, bird.dir);
  });
  bgPlanes.forEach((plane) => {
    const x = plane.x - cameraX * 0.2;
    ctx.globalAlpha = backgroundOpacity(plane);
    if (x > -100 && x < W + 100) drawPixelPlane(x, plane.y);
  });
  ctx.globalAlpha = 1;
}

function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a1a4e");
  grad.addColorStop(0.6, "#2d4a8a");
  grad.addColorStop(1, "#5c7aaa");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Twinkling stars (fixed in screen space for BG feel)
  if (world) {
    world.stars.forEach((s) => {      const brightness = 0.5 + 0.5 * Math.sin(s.twinkle);
      ctx.globalAlpha = brightness * 0.8;
      ctx.fillStyle = COL.starColor;
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
    [200, 120, 350],
    [600, 80, 280],
    [1000, 100, 320],
    [1400, 90, 260],
    [1800, 110, 300],
    [2200, 95, 270],
    [2600, 115, 330],
    [3000, 85, 250],
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
  ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.3, y - h * 0.3, w * 0.38, h * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x - w * 0.25, y - h * 0.2, w * 0.32, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

// --- Ground ---
function drawGround() {
  if (!world) return;
  const gY = world.groundY;
  const brickW = 52,
    brickH = 26;

  // Main fill
  const grad = ctx.createLinearGradient(0, gY, 0, H);
  grad.addColorStop(0, COL.groundTop);
  grad.addColorStop(0.15, COL.groundMid);
  grad.addColorStop(1, COL.groundDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, gY, W, H - gY);

  // Brick lines
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
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


  world.blocks.forEach((block) => {
    const sx = block.x - cameraX;
    if (sx + block.w < -20 || sx > W + 20) return;

    // Bump animation
    let bumpOffset = 0;
    if (block.anim > 0) {
      bumpOffset = Math.sin(((12 - block.anim) / 12) * Math.PI) * -12;
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
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

  // "?" symbol
  ctx.fillStyle = isVideo ? "#fff" : "#8b6000";
  ctx.font = `bold ${Math.round(h * 0.55)}px 'Press Start 2P', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isVideo ? "▶" : "?", x + w / 2, y + h / 2 + 2);
  ctx.textAlign = "left";
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
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

// --- Coins ---
function drawCoins() {
  if (!world) return;
  world.coins.forEach((c) => {
    if (!c.active || c.collected) return;
    const sx = c.x - cameraX;
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = COL.coinGold;
    ctx.beginPath();
    ctx.ellipse(
      sx + COIN_SIZE / 2,
      c.y + COIN_SIZE / 2,
      COIN_SIZE / 2,
      COIN_SIZE / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(
      sx + COIN_SIZE * 0.32,
      c.y + COIN_SIZE * 0.3,
      COIN_SIZE * 0.15,
      COIN_SIZE * 0.25,
      -0.5,
      0,
      Math.PI * 2,
    );
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
  const bmW = 24,
    bmH = 28;
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0)
      ctx.fillRect(cx + i * (cW / 4) - bmW / 2, cy - bmH, bmW, bmH);
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
  const waveT = bgTime * 13.333;
  ctx.fillStyle = "#e52521";
  ctx.beginPath();
  ctx.moveTo(cx + cW / 2 + 2, cy - 80);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
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
  ctx.fillStyle = COL.yellow;
  ctx.font = "bold 14px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("GOAL!", cx + cW / 2, cy - 96);
  ctx.textAlign = "left";
}

// --- HUD ---
function drawHUD() {
  const hud = $("hud");
  if (!hud) return;
  $("hud-score").textContent = String(score).padStart(6, "0");
  $("hud-coins").textContent = String(coinCount).padStart(2, "0");
  $("hud-world").textContent = "WORLD 1-1";
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
const FRAME_MS = 1000 / 60;
let lastTime = null;
let accumulator = 0;
let loopStarted = false;
function resetClock() { lastTime = null; accumulator = 0; }
function startLoop() {
  if (loopStarted) return;
  loopStarted = true;
  requestAnimationFrame(gameLoop);
}
function gameLoop(ts) {
  const elapsed = lastTime === null ? 0 : clamp(ts - lastTime, 0, 100);
  lastTime = ts;
  if (gameState === STATE.PLAYING) {
    accumulator += elapsed;
    while (accumulator >= FRAME_MS && gameState === STATE.PLAYING) {
      accumulator -= FRAME_MS;
      updatePlayer();
      updateCamera();
      updateCoins();
      updateBgFlyers();
      bgTime += 0.005;
      qAnimTime += 0.08;
      world.stars.forEach(star => star.twinkle += 0.03);
      world.blocks.forEach(block => { if (block.anim > 0) block.anim--; });
      if (gameState === STATE.PLAYING) checkLevelEnd();
    }
  } else accumulator = 0;

  ctx.clearRect(0, 0, W, H);

  if (world && (gameState === STATE.PLAYING || gameState === STATE.MODAL || gameState === STATE.PAUSED)) {
    // On mobile portrait apply an upward shift so the character and
    // ground are visible rather than crammed at the screen edge.
    if (mobileOffsetY > 0) (ctx.save(), ctx.translate(0, -mobileOffsetY));

    // Draw world
    drawBackground();
    drawBgFlyers();
    drawClouds();
    drawGround();
    drawBgTurtles();
    drawPipes();
    drawBlocks();
    drawCoins();
    drawCastle();
    drawPlayer();

    if (mobileOffsetY > 0) {
      ctx.restore();
      // Fill the exposed strip below the translated canvas content
      // with the ground's darkest colour so there's no black gap.
      ctx.fillStyle = COL.groundDark;
      ctx.fillRect(0, H - mobileOffsetY, W, mobileOffsetY);
      // Thin brick lines to match the ground texture
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      const brickH = 26;
      for (let row = 0; row * brickH < mobileOffsetY + brickH; row++) {
        const ry = H - mobileOffsetY + row * brickH;
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(W, ry);
        ctx.stroke();
      }
    }

    drawHUD();

    if (gameState === STATE.PAUSED) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", W / 2, H / 2);
      ctx.fillText("ESC or tap a control to resume", W / 2, H / 2 + 28, W - 24);
      ctx.textAlign = "left";
    }
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// MODAL
// ============================================================
let modalReturnState = STATE.PLAYING;
function showModal(project) {
  if (gameState !== STATE.MODAL) modalReturnState = gameState;
  clearInput();
  gameState = STATE.MODAL;

  const overlay = $("modal-overlay");
  const modal = $("project-modal");

  const isVideo = project.type === "video";

  const header = modal.querySelector(".modal-header");
  header.className = "modal-header" + (isVideo ? " video-header" : "");

  modal.querySelector(".modal-type-badge").textContent = isVideo
    ? "▶ VIDEO"
    : "◆ SOFTWARE";
  modal.querySelector(".modal-title-text").textContent = project.title;
  modal.querySelector(".modal-subtitle").textContent = project.subtitle || "";
  modal.querySelector(".modal-description").textContent = project.description;

  // Highlight
  const hl = modal.querySelector(".modal-highlight");
  hl.textContent = "★ " + (project.highlight || "Featured");
  hl.className = "modal-highlight" + (isVideo ? " video-hl" : "");

  // Technologies
  const tagsEl = modal.querySelector(".tech-tags");
  tagsEl.innerHTML = "";
  (project.technologies || []).forEach((t) => {
    const span = document.createElement("span");
    span.className = "tech-tag";
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
    a.href = project.github;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "modal-link-btn";
    a.textContent = "💻 GitHub";
    linksEl.appendChild(a);
  }
  if (project.live) {
    const a = document.createElement("a");
    a.href = project.live;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "modal-link-btn secondary";
    a.textContent = isVideo ? "▶ Watch" : "🌐 Live Demo";
    linksEl.appendChild(a);
  }
  if (!project.github && !project.live) {
    const span = document.createElement("span");
    span.className = "modal-link-btn secondary";
    span.textContent = "🔒 Private";
    linksEl.appendChild(span);
  }

  overlay.classList.add("active");
}

function closeModal() {
  $("modal-overlay").classList.remove("active");
  if (gameState === STATE.MODAL) gameState = modalReturnState;
  clearInput();
  resetClock();
}

// ============================================================
// RESUME MODAL
// ============================================================
function showResume() {
  const overlay = $("resume-overlay");
  const body = $("resume-body");
  const r = RESUME_DATA;

  $("resume-title").textContent = r.name;

  let html = "";
  html += `<div class="resume-contact">${r.contact}</div>`;
  html += `<div class="resume-headline">${r.headline}</div>`;
  html += `<div class="resume-summary">${r.summary}</div>`;

  // Skills
  html += `<div class="resume-section-title">⌨ TECHNICAL SKILLS</div>`;
  html += `<div class="resume-skills">`;
  r.skills.forEach((s) => {
    html += `<span class="resume-skill-tag">${s}</span>`;
  });
  html += `</div>`;

  // Experience
  html += `<div class="resume-section-title">⚔ EXPERIENCE</div>`;
  r.experience.forEach((job) => {
    html += `<div class="resume-job">`;
    html += `<div class="resume-job-header">`;
    html += `<div><div class="resume-job-role">${job.role}</div>`;
    html += `<div class="resume-job-company">${job.company} — ${job.location}</div></div>`;
    html += `<div class="resume-job-dates">${job.dates}</div>`;
    html += `</div>`;
    html += `<ul class="resume-job-bullets">`;
    job.bullets.forEach((b) => {
      html += `<li>${b}</li>`;
    });
    html += `</ul></div>`;
  });

  // Education
  html += `<div class="resume-section-title">🎓 EDUCATION</div>`;
  r.education.forEach((edu) => {
    html += `<div class="resume-edu">`;
    html += `<div><div class="resume-edu-school">${edu.school}</div>`;
    html += `<div class="resume-edu-degree">${edu.degree}</div></div>`;
    html += `<div class="resume-edu-year">${edu.year}</div>`;
    html += `</div>`;
  });

  body.innerHTML = html;
  overlay.classList.add("active");
}

function closeResume() {
  $("resume-overlay").classList.remove("active");
}

// Wire modal close button — moved to BOOT section below

// ============================================================
// END SCREEN
// ============================================================
function showEndScreen(skipped) {
  if (gameState === STATE.END) return;
  gameState = STATE.END;
  clearInput();

  const endScreen = $("end-screen");
  endScreen.classList.add("active");

  // Conditional header
  if (skipped) {
    $("end-title").textContent = "Not a gamer, huh?";
    $("end-subtitle").textContent = "No worries — here's the full portfolio!";
    $("end-score").style.display = "none";
  } else {
    $("end-title").innerHTML = "🏆 LEVEL CLEAR! 🏆";
    $("end-subtitle").textContent = "You've explored the full portfolio!";
    $("end-score").style.display = "";
    $("end-score-val").textContent = String(score).padStart(6, "0");
    $("end-coins-val").textContent = coinCount;
    $("end-blocks-val").textContent = world
      ? world.blocks.filter((b) => b.hit).length
      : 0;
    $("total-blocks-val").textContent = PROJECTS.length;
  }

  // Hide HUD
  $("hud").style.display = "none";
  $("controls-hint").style.display = "none";

  // Build project cards
  const softwareGrid = $("end-software-grid");
  const videoGrid = $("end-video-grid");
  softwareGrid.innerHTML = "";
  videoGrid.innerHTML = "";

  PROJECTS.forEach((proj, i) => {
    const card = document.createElement("div");
    const isVideo = proj.type === "video";
    card.className = "end-project-card" + (isVideo ? " video-card" : "");
    card.style.setProperty("--delay", `${i * 0.08}s`);

    let tagsHtml = "";
    (proj.technologies || []).forEach((t) => {
      tagsHtml += `<span class="end-card-tag">${t}</span>`;
    });

    let linksHtml = "";
    if (proj.github) {
      linksHtml += `<a href="${proj.github}" target="_blank" rel="noopener noreferrer" class="end-card-link">💻 GitHub</a>`;
    }
    if (proj.live) {
      linksHtml += `<a href="${proj.live}" target="_blank" rel="noopener noreferrer" class="end-card-link">${isVideo ? "▶ Watch" : "🌐 Live"}</a>`;
    }

    card.innerHTML = `
      <div class="end-card-type">${isVideo ? "▶ VIDEO" : "◆ SOFTWARE"}</div>
      <div class="end-card-title">${proj.title}</div>
      <div class="end-card-subtitle">${proj.subtitle || ""}</div>
      <div class="end-card-desc">${proj.description}</div>
      <div class="end-card-tags">${tagsHtml}</div>
      <div class="end-card-links">${linksHtml}</div>
    `;

    // Click card to open full project modal
    card.addEventListener("click", (e) => {
      if (e.target.closest(".end-card-link")) return; // don't hijack link clicks
      showModal(proj);
    });

    if (isVideo) {
      videoGrid.appendChild(card);
    } else {
      softwareGrid.appendChild(card);
    }
  });

  // Build social buttons
  const grid = $("social-links-grid");
  grid.innerHTML = "";
  Object.entries(SOCIAL_LINKS).forEach(([key, link], i) => {
    const a = document.createElement("a");
    a.className = "social-btn";
    a.style.setProperty("--delay", `${(PROJECTS.length + i) * 0.08}s`);
    a.innerHTML = `<span class="social-icon">${link.icon}</span>${link.label}`;

    if (key === "resume") {
      a.href = "#";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        showResume();
      });
    } else {
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }

    grid.appendChild(a);
  });

  // Play again
  const btn = $("play-again-btn");
  if (btn)
    btn.onclick = () => {
        endScreen.classList.remove("active");
        $("end-score").style.display = "";
        initWorld();
        gameState = STATE.PLAYING;
        $("game-screen").style.display = "block";
        $("hud").style.display = "flex";
        $("controls-hint").style.display = "block";
        startLoop();
      };
}

// ============================================================
// LANDING PAGE
// ============================================================
function setupLanding() {
  const screen = $("landing-screen");

  // Set personal info
  $("landing-title").textContent = PERSONAL_INFO.tagline;
  $("landing-subtitle").textContent = PERSONAL_INFO.title;
  $("start-btn").textContent = "▶ " + PERSONAL_INFO.cta;

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

  // Draw pixel avatar on canvas (fallback if no photo)
  const avatarImg = $("avatar-img");
  if (!avatarImg || !avatarImg.src || avatarImg.naturalWidth === 0) {
    drawLandingAvatar();
  }

  // Start button
  $("start-btn").addEventListener("click", startGame);

  // Skip button — go straight to portfolio
  $("skip-btn").addEventListener("click", () => {
    if (landingTransition) return;
    landingTransition = true;
    $("landing-screen").style.opacity = "0";
    setTimeout(() => {
      $("landing-screen").style.display = "none";
      showEndScreen(true);
    }, 600);
  });
}

function drawLandingAvatar() {
  const c = $("avatar-pixel-canvas");
  if (!c) return;
  const sz = (c.width = c.height = 180);
  const lc = c.getContext("2d");

  // Draw a large pixel character on the canvas
  lc.imageSmoothingEnabled = false;

  // Background circle
  const grad = lc.createRadialGradient(
    sz / 2,
    sz / 2,
    0,
    sz / 2,
    sz / 2,
    sz / 2,
  );
  grad.addColorStop(0, "rgba(92,148,252,0.4)");
  grad.addColorStop(0.7, "rgba(92,148,252,0.15)");
  grad.addColorStop(1, "transparent");
  lc.fillStyle = grad;
  lc.beginPath();
  lc.arc(sz / 2, sz / 2, sz / 2, 0, Math.PI * 2);
  lc.fill();

  // Yellow ring
  lc.strokeStyle = "#fbd000";
  lc.lineWidth = 4;
  lc.beginPath();
  lc.arc(sz / 2, sz / 2, sz / 2 - 6, 0, Math.PI * 2);
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
    R: "#e52521",
    B: "#1565c0",
    S: "#fad7a0",
    W: "#4e342e",
    H: "#3e2723",
    E: "#fff",
    P: "#e91e63",
  };
  const grid = [
    [null, null, null, "R", "R", "R", "R", "R", null, null, null],
    [null, null, "R", "R", "R", "R", "R", "R", "R", null, null],
    [null, null, "H", "H", "H", "H", "H", "H", "H", null, null],
    [null, "S", "S", "S", "S", "S", "S", "S", "S", "S", null],
    [null, "S", "S", "E", "S", "S", "S", "E", "S", "S", null],
    [null, "S", "S", "S", "S", "S", "S", "S", "S", "S", null],
    [null, "S", "S", "S", "P", "P", "P", "S", "S", "S", null],
    [null, "R", "R", "R", "B", "B", "B", "R", "R", "R", null],
    ["R", "R", "R", "B", "B", "B", "B", "B", "R", "R", "R"],
    ["R", "B", "B", "B", "B", "B", "B", "B", "B", "B", "R"],
    ["B", "B", null, null, null, null, null, null, null, "B", "B"],
    ["B", "B", null, null, null, null, null, null, null, "B", "B"],
    [null, "B", "B", "W", "W", "W", null, "W", "W", "W", "B"],
    [null, null, "W", "W", "W", null, null, null, "W", "W", null],
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
    const dist = sz / 2 - 4;
    lc.beginPath();
    lc.arc(
      sz / 2 + Math.cos(angle) * dist,
      sz / 2 + Math.sin(angle) * dist,
      3,
      0,
      Math.PI * 2,
    );
    lc.fill();
  }
}

// ============================================================
// START GAME
// ============================================================
let landingTransition = false;
function startGame() {
  if (landingTransition) return;
  landingTransition = true;
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

    startLoop();
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

  // Wire resume modal close
  const resumeClose = $("resume-close");
  if (resumeClose) resumeClose.addEventListener("click", closeResume);

  const resumeOverlay = $("resume-overlay");
  if (resumeOverlay) {
    resumeOverlay.addEventListener("click", (e) => {
      if (e.target === resumeOverlay) closeResume();
    });
  }

  setupMobileControls();
  setupLanding();
  // Game loop is started by startGame(), not on boot
});
