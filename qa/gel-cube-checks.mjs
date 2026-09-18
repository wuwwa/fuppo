import assert from 'node:assert/strict';

export async function runGelCubeChecks({load,reset,click,send,evaluate,diagnostics,waitFor,delay,touch,viewport,screenshot,record}) {
  const neutral=await load('gel-cube');await reset();
  record('Gel Cube resting',{screenshot:await screenshot('gel-cube-rest')});
  const top={id:1,x:195,y:365};
  await touch('touchStart',[top]);
  await waitFor(d=>d.state.contactCount===1,'Cube top contact');
  await delay(80);const brief=(await diagnostics()).state;
  await delay(1600);const held=(await diagnostics()).state;
  assert.ok(held.compression>brief.compression+.15,'Holding gives deeper compression');
  assert.ok(held.height<neutral.height-.25,'Real rendered height changes');
  record('Gel Cube held squeeze',{brief:brief.compression,held:held.compression,screenshot:await screenshot('gel-cube-held')});
  await touch('touchEnd',[top]);await delay(400);
  const released=(await diagnostics()).state;
  assert.equal(released.contactCount,0);assert.ok(released.compression>.1,'Deep squeeze rises gradually');
  assert.equal(released.audio.enabled,false);assert.equal(released.reaction.pops,0);
  record('Gel Cube release',{compression:released.compression,screenshot:await screenshot('gel-cube-release')});
  await waitFor(d=>d.state.sleeping && d.state.compression<.001,'Cube completes recovery and sleeps',18000);
  await reset();

  let points=[{id:2,x:152,y:422},{id:3,x:238,y:422}];
  await touch('touchStart',points);
  await waitFor(d=>d.state.contactCount===2,'Cube two-finger contact');
  for(let i=1;i<=12;i++) {
    points=[{id:2,x:152-i*3,y:422},{id:3,x:238+i*3,y:422}];
    await touch('touchMove',points);await delay(45);
  }
  await delay(600);
  const stretched=(await diagnostics()).state;
  assert.ok(stretched.width>neutral.width+.2,'Two fingers visibly stretch the cube');
  assert.ok(stretched.minVolumeRatio>0,'The cage remains upright');
  record('Gel Cube stretch',{screenshot:await screenshot('gel-cube-stretch')});
  await touch('touchEnd',[points[0]]);
  await waitFor(d=>d.state.contactCount===1,'Partial release preserves one grip');
  await touch('touchMove',[{...points[1],x:points[1].x+15}]);await delay(250);
  assert.equal((await diagnostics()).state.contactCount,1);
  await viewport(844,390);await waitFor(d=>d.state.contactCount===0,'Resize cancels held input');
  await touch('touchCancel',[]);await viewport(390,844);await reset();

  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await touch('touchStart',[top]);await touch('touchEnd',[top]);
  const key=type=>send('Input.dispatchKeyEvent',{type,code:'Space',key:' ',windowsVirtualKeyCode:32});
  await key('keyDown');await waitFor(d=>d.state.keyboardActive && d.state.compression>.3,'Reduced-motion keyboard hold');
  await key('keyUp');await waitFor(d=>!d.state.keyboardActive && !d.state.contactCount,'Keyboard release');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await reset();
  await click('button[aria-label="Enable gel cube sounds"]');await waitFor(d=>d.state.audio.enabled,'Audio opt-in');
  await touch('touchStart',[top]);await delay(100);await touch('touchEnd',[top]);
  await click('button[aria-label="Mute gel cube sounds"]');await waitFor(d=>!d.state.audio.enabled,'Mute');

  await viewport(1200,900);await reset();
  const mouse=(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
  await mouse('mousePressed',600,430);await waitFor(d=>d.state.contactCount===1,'Mouse contact');
  await mouse('mouseMoved',700,420);await delay(800);await mouse('mouseReleased',700,420);
  await waitFor(d=>!d.state.contactCount,'Mouse release');
  record('Gel Cube desktop',{screenshot:await screenshot('gel-cube-desktop')});
  await viewport(320,568);await reset();
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight'),'Small layout fits');
  record('Gel Cube small phone',{screenshot:await screenshot('gel-cube-small')});
  await click('.collection-trigger');
  assert.ok(await evaluate('!!document.querySelector(".collection-item[href*=gel-cube]")'),'Registered collection entry');
  assert.equal(await evaluate('!!document.querySelector(".collection-item[href*=dough]")'),false,'Dough remains parked');
  await click('.close-collection');await viewport(390,844);await reset();
  const final=await diagnostics();
  assert.deepEqual(final.state.memory,neutral.memory,'Interaction and resize retain graphics resource counts');
  assert.ok(final.trace.length>0 && final.trace.every(event=>event.trusted));
  record('Gel Cube touch, mouse, keyboard, reduced motion, cancellation, sound, collection and resources passed');
}
