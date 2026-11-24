const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function game() {
  const elements = new Map(), events = {}, windowEvents = {}, frames = [];
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {}, set: () => true });
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {style:{setProperty(){}}, classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)}, getContext:()=>context, addEventListener(){}, querySelector:sel=>element(id+sel), appendChild(){}, setPointerCapture(){}, naturalWidth:100, src:'photo'});
    }
    return elements.get(id);
  }
  const sandbox = vm.createContext({console, Math, setTimeout:fn=>fn(), requestAnimationFrame:fn=>frames.push(fn), window:{innerWidth:1280,innerHeight:800,addEventListener:(n,f)=>windowEvents[n]=f}, document:{getElementById:element, querySelectorAll:()=>[],createElement:()=>element(Symbol()),addEventListener:(n,f)=>events[n]=f}});
  for (const file of ['data.js','game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),sandbox);
  return {run:code=>vm.runInContext(code,sandbox),frames,events,windowEvents};
}
test('only available video remains and level follows project count',()=>{
  const g=game();
  assert.equal(g.run('PROJECTS.filter(p=>p.type === "video").map(p=>p.title).join()'),'Editing Showreel');
  assert.equal(g.run('initWorld(); world.blocks.length'),6);
});
test('30, 60, 120 and 144 Hz produce the same movement',()=>{
  const positions = [30,60,120,144].map(hz=>{
    const g=game();g.run('initWorld(); gameState=STATE.PLAYING; keys.KeyD=true; gameLoop(0)');
    for(let i=1;i<=hz*2;i++)g.run(`gameLoop(${i*1000/hz})`);
    return g.run('player.x');
  });
  assert.ok(Math.max(...positions)-Math.min(...positions)<6,positions.join());
});
test('100 replay cycles retain one animation loop and reset progress',()=>{
  const g=game();g.run('startGame()');
  for(let i=0;i<100;i++)g.run('showEndScreen(); $("play-again-btn").onclick()');
  assert.equal(g.frames.length,1);
  assert.equal(g.run('score'),0);
  assert.equal(g.run('world.blocks.filter(b=>b.hit).length'),0);
});
test('portfolio modal returns to portfolio; gameplay modal returns to game',()=>{
  const g=game();
  for (const state of ['END','PLAYING']) {
    g.run(`gameState=STATE.${state}; showModal(PROJECTS[0]); closeModal()`);
    assert.equal(g.run('gameState'),state.toLowerCase());
  }
});
test('held jump fires once and fresh press jumps again',()=>{
  const g=game();g.run('initWorld(); updatePlayer(); keys.Space=true; for(let i=0;i<180;i++) updatePlayer()');
  assert.equal(g.run('score'),5);
  assert.equal(g.run('player.onGround'),true);
  g.run('keys.Space=false; updatePlayer(); keys.Space=true; updatePlayer()');
  assert.equal(g.run('score'),10);
});
test('resize preserves geometry and progress, including ultra-wide viewport',()=>{
  const g=game();g.run('initWorld(); world.blocks[0].hit=true; window.innerHeight=500; window.innerWidth=5000');g.windowEvents.resize();
  assert.equal(g.run('world.groundY'),410);
  assert.equal(g.run('player.y+CHAR_H'),410);
  assert.equal(g.run('world.blocks[0].hit'),true);
  assert.equal(g.run('cameraX'),0);
});
test('blur clears input and pauses; long frames have bounded catch-up',()=>{
  const g=game();g.run('initWorld(); gameState=STATE.PLAYING; keys.KeyD=true; touch.jump=true');g.windowEvents.blur();
  assert.equal(g.run('gameState'),'paused');
  assert.equal(g.run('!!isRight() || !!isJump()'),false);
  g.run('gameState=STATE.PLAYING; keys.KeyD=true; gameLoop(0); gameLoop(60000)');
  assert.ok(g.run('player.x')<120);
});
test('block reward is awarded through collision only once',()=>{
  const g=game();g.run('initWorld(); const b=world.blocks[0]; player.x=b.x; player.y=b.y+b.h-5; player.vy=-8; collidePlayerBlock(player,b)');
  assert.equal(g.run('coinCount'),3);
  assert.equal(g.run('score'),250);
  g.run('closeModal(); player.y=b.y+b.h-5; player.vy=-8; collidePlayerBlock(player,b)');
  assert.equal(g.run('score'),250);
});

test('60,000 simulation steps keep player and effects bounded',()=>{
  const g=game();
  g.run('initWorld(); for(let i=0;i<60000;i++){ keys.KeyD=i%600<300; keys.KeyA=!keys.KeyD; keys.Space=i%70===0; updatePlayer(); updateCamera(); updateCoins(); updateBgFlyers(); if(gameState===STATE.MODAL) closeModal(); }');
  assert.equal(g.run('[player.x,player.y,player.vx,player.vy,cameraX].every(Number.isFinite)'),true);
  assert.equal(g.run('player.x>=0 && player.x<=world.worldW-CHAR_W'),true);
  assert.ok(g.run('bgBirds.length')<=1);
  assert.ok(g.run('bgPlanes.length')<=1);
  assert.ok(g.run('bgTurtles.length')<=1);
  assert.ok(g.run('coinCount')<=18);
});
test('every block supports repeated vertical jumps and landing in place',()=>{
  const g=game();
  g.run('initWorld()');
  for(let index=0;index<6;index++) {
    g.run(`clearInput(); const block${index}=world.blocks[${index}]; player.x=block${index}.x+4; player.y=block${index}.y-CHAR_H; player.vx=0; player.vy=0; player.onGround=true; player.coyoteTime=0;`);
    for(let jump=0;jump<3;jump++) {
      const startY=g.run('player.y'), startX=g.run('player.x');
      g.run('keys.Space=true; updatePlayer()');
      assert.ok(g.run('player.y')<startY,`block ${index} jump ${jump} must lift off`);
      assert.ok(g.run('player.vy')<0);
      g.run('keys.Space=false; for(let frame=0;frame<90;frame++) updatePlayer()');
      assert.equal(g.run('player.y'),startY);
      assert.equal(g.run('player.x'),startX);
      assert.equal(g.run('player.onGround'),true);
    }
  }
});
test('Editing Showreel is the only video block and leads directly to castle',()=>{
  const g=game();g.run('initWorld()');
  assert.equal(g.run('world.blocks.filter(b=>b.project.type==="video").length'),1);
  assert.equal(g.run('world.blocks.at(-1).project.title'),'Editing Showreel');
  assert.equal(g.run('world.castleX-(world.blocks.at(-1).x+BLOCK_SIZE)'),180);
  assert.equal(g.run('world.pipes.some(p=>p.x>world.blocks.at(-1).x)'),false);
  g.run('gameState=STATE.PLAYING; player.x=world.blocks.at(-1).x+BLOCK_SIZE; player.y=world.groundY-CHAR_H; keys.KeyD=true; for(let i=0;i<100 && gameState===STATE.PLAYING;i++){updatePlayer();checkLevelEnd()}');
  assert.equal(g.run('gameState'),'end');
});
test('background spawns one or two of each per minute with slower motion and no stacking',()=>{
  const g=game();g.run('initWorld()');
  const counts=[0,0,0];
  for(let minute=0;minute<3;minute++) {
    const before=counts.slice();
    for(let frame=0;frame<3600;frame++) {
      g.run('updateBgFlyers()');
      for(const [i,name] of ['bgBirds','bgPlanes','bgTurtles'].entries()) {
        assert.ok(g.run(`${name}.length`)<=1);
        if(g.run(`${name}[0]?.age`)===1)counts[i]++;
      }
    }
    for(let i=0;i<3;i++)assert.ok(counts[i]-before[i]>=1 && counts[i]-before[i]<=2);
  }
  g.run('initBgFlyers(); updateBgFlyers(); const birdStart=bgBirds[0].x; updateBgFlyers()');
  assert.equal(g.run('bgBirds[0].x-birdStart'),0.25);
  assert.equal(g.run('bgPlanes.length+bgTurtles.length'),0);
});
