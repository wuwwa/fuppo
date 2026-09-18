import assert from 'node:assert/strict';

/** Trusted browser input complements the timed, real-skin physics comparisons. */
export async function runButterChecks({load,reset,click,send,diagnostics,waitFor,delay,touch,viewport,screenshot,record}) {
  const neutral=await load('butter');await reset();
  const top={id:1,x:195,y:415};
  await touch('touchStart',[top]);
  await waitFor(d=>d.state.contactCount===1,'Butter touch registers');
  await delay(80);
  const brief=(await diagnostics()).state;
  await delay(1300);
  const held=(await diagnostics()).state;
  assert.ok(held.compression>brief.compression+.15,'Holding sinks deeper than brief contact');
  assert.ok(held.height<brief.height-.1,'The visible mesh must compress');
  record('Butter deep hold',{brief:brief.compression,held:held.compression,screenshot:await screenshot('butter-deep-hold')});
  await touch('touchEnd',[top]);await delay(350);
  const released=(await diagnostics()).state;
  assert.equal(released.contactCount,0);
  assert.ok(released.compression>held.compression*.65,'Foam stays compressed after release');
  assert.equal(released.audio.enabled,false);
  record('Butter slow rise',{screenshot:await screenshot('butter-slow-rise')});
  await reset();

  let points=[{id:2,x:145,y:445},{id:3,x:245,y:435}];
  await touch('touchStart',points);
  await waitFor(d=>d.state.contactCount===2,'Two independent Butter grips');
  for(let i=1;i<=14;i++) {
    points=[{id:2,x:145-i*3,y:445},{id:3,x:245+i*3,y:435}];
    await touch('touchMove',points);await delay(35);
  }
  await delay(600);
  const stretched=(await diagnostics()).state;
  assert.ok(stretched.width>neutral.width+.2,'Separated fingers visibly stretch the foam');
  assert.ok(stretched.minVolumeRatio>.01,'Stretching keeps the cage upright');
  record('Butter two-finger stretch',{width:stretched.width,screenshot:await screenshot('butter-two-finger')});
  await touch('touchEnd',[points[0]]);
  await waitFor(d=>d.state.contactCount===1 && d.state.pointerCount===1,'Partial release keeps the other grip');
  points[1]={...points[1],x:points[1].x+20,y:points[1].y-15};
  await touch('touchMove',[points[1]]);await delay(350);
  assert.equal((await diagnostics()).state.contactCount,1);
  record('Butter surviving grip',{screenshot:await screenshot('butter-partial-release')});
  await viewport(844,390);
  await waitFor(d=>d.state.contactCount===0 && d.state.pointerCount===0,'Resize cancels Butter grips');
  await touch('touchCancel',[]);await viewport(390,844);await reset();

  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await touch('touchStart',[top]);await touch('touchEnd',[top]);
  const key=type=>send('Input.dispatchKeyEvent',{type,code:'Space',key:' ',windowsVirtualKeyCode:32});
  await key('keyDown');
  await waitFor(d=>d.state.keyboardActive && d.state.compression>.3,'Keyboard hold works with reduced motion');
  await key('keyUp');
  await waitFor(d=>!d.state.keyboardActive && d.state.contactCount===0,'Keyboard release');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await reset();

  await click('button[aria-label="Enable butter sounds"]');
  await waitFor(d=>d.state.audio.enabled,'Sound remains opt-in');
  await touch('touchStart',[top]);await delay(100);await touch('touchEnd',[top]);
  await click('button[aria-label="Mute butter sounds"]');
  await waitFor(d=>!d.state.audio.enabled,'Mute works after a gesture');
  await reset();
  const final=await diagnostics();
  assert.deepEqual(final.state.memory,neutral.memory,'Gestures and reset retain graphics resource counts');
  assert.ok(final.trace.length>0 && final.trace.every(event=>event.trusted));
  assert.deepEqual(final.viewport,{width:390,height:844,scrollX:0,scrollY:0,scale:1});
  record('Butter touch, partial release, resize, keyboard, reduced motion, sound and reset passed');
}
