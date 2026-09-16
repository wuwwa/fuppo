import assert from 'node:assert/strict';

export async function runPeelChecks({load,reset,click,send,diagnostics,waitFor,delay,touch,viewport,screenshot,record}) {
  for(const toy of ['butter','cushion','loop','star','putty','dough']) {
    await load(toy);await reset();
    const start={id:1,x:toy==='loop'?246:220,y:toy==='butter'?440:420};
    await touch('touchStart',[start]);
    await waitFor(d=>d.state.contactCount===1,`${toy} grip`);
    await delay(250);assert.equal((await diagnostics()).state.adhesion.progress,0);
    for(let i=1;i<=24;i++) {
      await touch('touchMove',[{...start,x:start.x+i*1.2,y:start.y-i*10}]);await delay(45);
      if(i===10)record(`${toy} peeling`,{screenshot:await screenshot(`${toy}-peeling`)});
    }
    const held=await waitFor(d=>d.state.adhesion.detached,`${toy} detached`,12000);
    assert.equal(held.state.adhesion.releases,1);assert.equal(held.state.reaction.pops,0);
    assert.ok(held.state.adhesion.lift>.4);assert.equal(held.state.audio.enabled,false);
    record(`${toy} detached`,{adhesion:held.state.adhesion,screenshot:await screenshot(`${toy}-detached`)});
    await touch('touchCancel',[]);
    await waitFor(d=>d.state.contactCount===0 && d.state.adhesion.progress===0,`${toy} settles`);
    await reset();await waitFor(d=>d.state.adhesion.releases===0,`${toy} reset peel`);
  }
  await load('butter');await reset();
  await touch('touchStart',[{id:1,x:220,y:440}]);await delay(80);
  await touch('touchEnd',[{id:1,x:220,y:440}]);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const key=(type,code)=>send('Input.dispatchKeyEvent',{type,code,key:code==='Space'?' ':code,windowsVirtualKeyCode:code==='Space'?32:38});
  await key('keyDown','Space');await key('keyDown','ArrowUp');
  await waitFor(d=>d.state.adhesion.detached,'Keyboard reduced-motion peel',12000);
  await key('keyUp','ArrowUp');await key('keyUp','Space');
  await waitFor(d=>d.state.adhesion.progress===0,'Keyboard release');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await viewport(1200,900);await reset();
  await click('button[aria-label="Enable butter sounds"]');
  await waitFor(d=>d.state.audio.enabled,'Sound consent');
  const mouse=(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
  await mouse('mousePressed',650,470);await waitFor(d=>d.state.contactCount===1,'Desktop grip');
  for(let i=1;i<=24;i++){await mouse('mouseMoved',650+i*10,470-i*14);await delay(40);}
  const detached=await waitFor(d=>d.state.adhesion.detached,'Mouse peel');
  assert.ok(detached.state.audio.transientVoices>0,'Final peel plays the consented release accent');
  record('butter desktop detached',{screenshot:await screenshot('butter-desktop-detached')});
  await viewport(844,390);
  await waitFor(d=>d.state.contactCount===0 && d.state.adhesion.progress===0,'Resize releases peel');
  await mouse('mouseReleased',890,134);
  record('peel touch, keyboard, mouse and resize passed');
}
