import test from 'node:test';
import assert from 'node:assert/strict';
import { FloorAdhesion, type PeelContact } from '../src/soft-body/adhesion.ts';
import { SoftBodyPhysics, STEP, FLOOR } from '../src/soft-body/physics.ts';
import { butterProfile, cushionProfile, loopProfile, starProfile, puttyProfile, doughProfile } from '../src/soft-body/profiles.ts';

const advance = (body: SoftBodyPhysics, seconds: number) => {
  for(let i=0;i<seconds/STEP;i++) body.step();
};
const sample = (body: SoftBodyPhysics, x: number, y: number, z: number) => {
  const output=new Float32Array(3);
  body.deform(new Float32Array([x,y,z]),output,[body.bind(x,y,z)]);
  return output;
};

test('presses, short stretches, downward pushes and inward folds stay attached', () => {
  for(const offset of [{x:0,y:0,z:0},{x:.35,y:.2,z:0},{x:2,y:-1,z:0},{x:-2,y:0,z:0}]) {
    const peel=new FloorAdhesion(butterProfile.feel.adhesion!);
    const contact={id:1,anchor:{x:1,y:.5,z:0},offset,pressure:0};
    for(let i=0;i<600;i++)peel.step(STEP,[contact],false);
    assert.equal(peel.progress,0);
  }
});

test('a peel lifts the near edge before the far edge and a yank cannot skip resistance', () => {
  const peel=new FloorAdhesion(cushionProfile.feel.adhesion!);
  const c:PeelContact={id:1,anchor:{x:1,y:.5,z:0},offset:{x:1,y:2,z:0},pressure:0};
  for(let i=0;i<100;i++)peel.step(STEP,[c],false);
  assert.ok(peel.progress>.2 && peel.progress<.65);
  const near=peel.offset(1,0,{x:0,y:0,z:0}),far=peel.offset(-1,0,{x:0,y:0,z:0});
  assert.ok(near.y>.08); assert.equal(far.y,0);
  assert.equal(peel.detached,false);
  for(let i=0;i<400;i++)peel.step(STEP,[c],false);
  assert.equal(peel.detached,true); assert.equal(peel.releases,1);
  assert.ok(peel.offset(-1,0,{x:0,y:0,z:0}).y>.5);
  for(let i=0;i<300;i++)peel.step(STEP,[c],false);
  assert.equal(peel.releases,1,'A held peel must only release once');
});

test('partial peels stop advancing at insufficient travel and extra fingers do not multiply effort', () => {
  const single=new FloorAdhesion(cushionProfile.feel.adhesion!);
  const multiple=new FloorAdhesion(cushionProfile.feel.adhesion!);
  const c={id:1,anchor:{x:1,y:.5,z:0},offset:{x:0,y:1.2,z:0},pressure:0};
  for(let i=0;i<900;i++) {
    single.step(STEP,[c],false); multiple.step(STEP,[c,{...c,id:2},{...c,id:3}],false);
  }
  assert.ok(single.progress>.2 && single.progress<.5);
  assert.equal(single.progress,multiple.progress); assert.equal(single.releases,0);
});

test('peeling has an exact inverse throughout its contact line and settles after cancellation', () => {
  const peel=new FloorAdhesion(butterProfile.feel.adhesion!);
  const c={id:1,anchor:{x:1,y:.5,z:.2},offset:{x:.6,y:2,z:.3},pressure:0};
  for(let i=0;i<420;i++) {
    peel.step(STEP,[c],false);
    for(const p of [{x:-1,y:FLOOR,z:0},{x:.8,y:.5,z:.3}]) {
      const offset=peel.offset(p.x,p.z,{x:0,y:0,z:0});
      const inverse=peel.unmap({x:p.x+offset.x,y:p.y+offset.y,z:p.z+offset.z});
      assert.ok(Math.hypot(inverse.x-p.x,inverse.y-p.y,inverse.z-p.z)<1e-10);
    }
  }
  for(let i=0;i<240;i++)peel.step(STEP,[],true);
  assert.equal(peel.active,false); assert.equal(peel.detached,false);
});

for(const profile of [butterProfile,cushionProfile,loopProfile,starProfile,puttyProfile,doughProfile]) {
  test(`${profile.shape} peels the entire visible base, stays finite, and reattaches`, () => {
    const body=new SoftBodyPhysics(profile.feel);
    body.beginGrab({x:.8,y:.75,z:.2});body.setPressure(0);
    body.moveGrab({x:.25,y:profile.shape==='butter'?2.8:2.2,z:0});
    advance(body,5);
    assert.equal(body.adhesion!.detached,true);
    for(const x of [-1,0,1]) assert.ok(sample(body,x,FLOOR,0)[1]>.5);
    assert.ok([...body.positions].every(Number.isFinite));
    assert.ok(body.diagnostics().minVolumeRatio>.01);
    assert.ok(body.diagnostics().displacement<2.5);
    body.releaseAll();advance(body,2);
    assert.equal(body.adhesion!.active,false);
    assert.ok(sample(body,0,FLOOR,0)[1]<FLOOR+.01);
    body.reset();assert.equal(body.adhesion!.releases,0);
    assert.equal(body.adhesion!.active,false);
  });
}

test('reduced motion preserves peel effort and reset clears a partially lifted base', () => {
  const regular=new SoftBodyPhysics(butterProfile.feel),reduced=new SoftBodyPhysics(butterProfile.feel);
  reduced.reducedMotion=true;
  for(const b of [regular,reduced]) {b.beginGrab({x:1,y:.6,z:0});b.setPressure(0);b.moveGrab({x:0,y:2,z:0});advance(b,1);}
  assert.equal(regular.adhesion!.progress,reduced.adhesion!.progress);
  reduced.reset();assert.equal(reduced.isAtRest(),true);
  assert.ok(sample(reduced,1,FLOOR,0)[1]<FLOOR+.01);
});

test('catching a settling toy without pulling cannot leave a half-peeled base suspended', () => {
  const peel=new FloorAdhesion(cushionProfile.feel.adhesion!);
  const c={id:1,anchor:{x:1,y:.5,z:0},offset:{x:0,y:2,z:0},pressure:0};
  for(let i=0;i<480;i++)peel.step(STEP,[c],false);
  for(let i=0;i<30;i++)peel.step(STEP,[],false);
  assert.ok(peel.progress>0);
  for(let i=0;i<300;i++)peel.step(STEP,[{...c,id:2,offset:{x:0,y:0,z:0},pressure:1}],false);
  assert.equal(peel.active,false);assert.equal(peel.detached,false);
});

test('Butter stays bonded on a long ordinary stretch and releases only near the material limit', () => {
  const body=new SoftBodyPhysics(butterProfile.feel);
  body.beginGrab({x:.8,y:.75,z:.2});body.setPressure(0);
  body.moveGrab({x:.25,y:2.2,z:0});advance(body,8);
  assert.equal(body.adhesion!.detached,false,'Waiting is not enough to detach Butter');
  assert.equal(body.adhesion!.diagnostics().lift,0,'The whole base stays down until the last strip yields');
  assert.ok(sample(body,.8,.75,.2)[1]>1.7,'The foam visibly elongates while stuck');
  body.moveGrab({x:.25,y:2.8,z:0});
  let previous=sample(body,.8,.75,.2),maxJump=0;
  for(let i=0;i<600;i++) {
    body.step();const current=sample(body,.8,.75,.2);
    maxJump=Math.max(maxJump,Math.hypot(...current.map((v,j)=>v-previous[j])));
    previous=current;
    assert.equal(body.diagnostics().contactCount,1,'Detaching must not reset the grip');
  }
  assert.equal(body.adhesion!.releases,1);assert.ok(maxJump<.08,`Release jump: ${maxJump}`);
});

test('the last strip requires sustained actual stretch, and settling never runs the peel backward', () => {
  const peel=new FloorAdhesion(butterProfile.feel.adhesion!);
  const contact={id:1,anchor:{x:1,y:.5,z:0},offset:{x:0,y:3,z:0},pressure:0,stretch:.8};
  for(let i=0;i<900;i++)peel.step(STEP,[contact],false);
  assert.equal(peel.progress,.92);assert.equal(peel.detached,false);
  assert.equal(peel.offset(-1,0,{x:0,y:0,z:0}).y,0);
  contact.stretch=1;
  for(let i=0;i<50;i++)peel.step(STEP,[contact],false);
  assert.equal(peel.detached,false,'A quick yank cannot bypass the final bond');
  for(let i=0;i<240;i++)peel.step(STEP,[contact],false);
  assert.equal(peel.releases,1);
  let previous=[-1,0,1].map(x=>peel.offset(x,0,{x:0,y:0,z:0}).y);
  for(let i=0;i<240;i++) {
    peel.step(STEP,[],false);
    const current=[-1,0,1].map(x=>peel.offset(x,0,{x:0,y:0,z:0}).y);
    current.forEach((y,j)=>assert.ok(y<=previous[j]+1e-8,'Released underside must only settle downward'));
    previous=current;
  }
  assert.equal(peel.active,false);
});

test('an extreme solver kick is contained without resetting an airborne toy or dropping its grip', () => {
  const body=new SoftBodyPhysics(butterProfile.feel);
  body.beginGrab({x:.8,y:.75,z:.2});body.setPressure(0);body.moveGrab({x:.25,y:2.8,z:0});advance(body,5);
  assert.equal(body.adhesion!.releases,1);
  const before=new Float64Array(body.positions);
  body.velocities.fill(10000);body.step();
  assert.equal(body.diagnostics().contactCount,1);
  assert.equal(body.adhesion!.releases,1);
  assert.ok(body.diagnostics().containmentCorrections>0);
  assert.ok(body.positions.every((v,j)=>Number.isFinite(v) && Math.abs(v-before[j])<=.100001));
  body.releaseAll();advance(body,16);assert.equal(body.isAtRest(),true);
});
