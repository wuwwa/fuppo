import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const backend=process.argv.includes('--webgl')?'webgl':'webgpu';
const artifacts=resolve('qa/artifacts');
await mkdir(artifacts,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'codex-jelly-audio-'));
const chrome=spawn(process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
  '--no-first-run','--no-default-browser-check','--mute-audio',
  '--disable-background-timer-throttling','--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows','--enable-unsafe-webgpu',
  '--enable-unsafe-swiftshader','about:blank',
],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket,session,sequence=0;
const pending=new Map(),contexts=new Map(),contextEvents=[],errors=[],results=[];
const send=(method,params={},sessionId=session)=>new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`${method} timed out`));},15000);
  pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
  socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});
const evaluate=async expression=>{
  const result=await send('Runtime.evaluate',{expression,returnByValue:true});
  if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const diagnostics=()=>evaluate(`(()=>{
  const canvas=document.querySelector('canvas');
  return {state:canvas?.dataset.diagnostics?JSON.parse(canvas.dataset.diagnostics):null,
    text:document.body.innerText,url:location.href};
})()`);
const waitFor=async(predicate,label,timeout=10000)=>{
  const started=Date.now();
  while(Date.now()-started<timeout) {
    const data=await diagnostics();
    if(predicate(data))return data;
    await delay(75);
  }
  throw new Error(`${label}: ${JSON.stringify(await diagnostics())}`);
};
const record=async label=>{
  const {state}=await diagnostics();
  const entry={label,backend:state?.backend,contacts:state?.contactCount,audio:state?.audio};
  results.push(entry);console.log(JSON.stringify(entry));return state;
};
const click=async selector=>{
  const point=await evaluate(`(()=>{
    const element=document.querySelector(${JSON.stringify(selector)});
    if(!element || element.disabled)return null;
    const rect=element.getBoundingClientRect();
    return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  })()`);
  if(!point)throw new Error(`No enabled UI control: ${selector}`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...point});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...point});
  await delay(60);
};
const setVolume=async value=>{
  if(await evaluate(`document.querySelector('.volume-panel')?.hidden`))await click('.volume-trigger');
  await evaluate(`(()=>{
    const input=document.querySelector('.volume-slider');
    if(!input || input.disabled)throw new Error('No enabled volume meter');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(String(value))});
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
};
const touch=(type,points)=>send('Input.dispatchTouchEvent',{
  type,touchPoints:points.map(({id,x,y})=>({id,x,y,radiusX:12,radiusY:12,force:0.6})),
});
const moveHands=async points=>{
  let active=false;
  for(let step=0;step<16;step++) {
    const moved=points.map((point,index)=>({id:point.id,x:point.x+Math.sin(step*0.6)*22*(index? -1:1),y:point.y+Math.cos(step*0.6)*12}));
    await touch('touchMove',moved);await delay(55);
    const {state}=await diagnostics();
    if(state?.audio?.gestureActive && state.contactCount===points.length)active=true;
    if((state?.audio?.transientVoices??0)>3)throw new Error('Transient voice limit exceeded');
  }
  if(!active)throw new Error(`Moving hands never activated gesture audio: ${JSON.stringify(await diagnostics())}`);
};
try {
  let portInfo;
  for(let i=0;i<100;i++) {
    try {portInfo=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);break;}
    catch {await delay(100);}
  }
  if(!portInfo)throw new Error('Isolated Chrome did not start');
  socket=new WebSocket(`ws://127.0.0.1:${portInfo[0]}${portInfo[1]}`);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id) {
      const request=pending.get(message.id);if(!request)return;pending.delete(message.id);
      if(message.error)request.reject(new Error(JSON.stringify(message.error)));else request.resolve(message.result);
    } else if(message.method==='WebAudio.contextCreated' || message.method==='WebAudio.contextChanged') {
      const context=message.params.context;contexts.set(context.contextId,context.contextState);
      contextEvents.push({event:message.method,id:context.contextId,state:context.contextState});
    } else if(message.method==='WebAudio.contextWillBeDestroyed') {
      contexts.set(message.params.contextId,'destroyed');contextEvents.push({event:message.method,id:message.params.contextId});
    } else if(message.method==='Runtime.exceptionThrown' || message.method==='Log.entryAdded' && message.params.entry.level==='error')errors.push(message);
  });
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);
  ({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('WebAudio.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await send('Page.navigate',{url:`http://127.0.0.1:5174/?toy=cushion${backend==='webgl'?'&renderer=webgl':''}`});
  await waitFor(data=>data.state?.entrance>=0.95,'Toy readiness',25000);
  const initialVolume=await evaluate(`document.querySelector('.volume-slider')?.value`);
  if(initialVolume!=='80')throw new Error(`Unexpected initial volume: ${initialVolume}`);
  assert.equal(await evaluate(`document.querySelector('.volume-panel').hidden`),true);
  await click('.volume-trigger');
  assert.equal(await evaluate(`document.activeElement.className`),'volume-slider');
  const range=await evaluate(`(()=>{const e=document.querySelector('.volume-slider'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,top:r.top+13,bottom:r.bottom-13};})()`);
  // Exercise the actual browser slider, including captured movement outside its width.
  const startY=range.bottom-(range.bottom-range.top)*.8;
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:range.x,y:startY});
  const values=[];
  for(let step=1;step<=12;step++){
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:range.x+20,y:startY+step*3});
    values.push(Number(await evaluate(`document.querySelector('.volume-slider').value`)));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:range.x+20,y:startY+36});
  assert.ok(values.at(-1)<60 && values.every((v,i)=>i===0 || v<values[i-1]),'Downward drag must lower volume continuously');
  assert.ok(values.some(v=>v%5!==0),'Dragging must not snap to five-percent increments');
  await setVolume(50);
  await touch('touchStart',[{id:7,x:range.x,y:(range.top+range.bottom)/2}]);
  await touch('touchMove',[{id:7,x:range.x,y:range.top+10}]);
  await touch('touchEnd',[]);
  assert.ok(Number(await evaluate(`document.querySelector('.volume-slider').value`))>85,'Upward touch drag must raise volume');
  await setVolume(50);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
  assert.equal(Number(await evaluate(`document.querySelector('.volume-slider').value`)),51);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate(`document.querySelector('.volume-panel').hidden`),true);
  assert.equal(await evaluate(`document.activeElement.className`),'volume-trigger');
  for(const [width,height,mobile] of [[320,568,true],[280,653,true],[568,320,true],[1366,768,false]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});
    await delay(100);
    await click('.volume-trigger');
    const panel=await evaluate(`(()=>{const r=document.querySelector('.volume-panel').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()`);
    assert.ok(panel.right>panel.x&&panel.bottom>panel.y&&panel.x>=0&&panel.y>=0&&panel.right<=width&&panel.bottom<=height,`Volume panel fits ${width}x${height}: ${JSON.stringify(panel)}`);
    const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(artifacts,`volume-${width}x${height}.png`),Buffer.from(data,'base64'));
    await click('.volume-trigger');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});
  await setVolume(40);
  await waitFor(data=>data.state?.audio?.volume===.4,'Muted volume update');
  if(contexts.size!==0)throw new Error('Adjusting volume created an audio context before consent');
  await delay(220);
  const savedVolume=await evaluate(`JSON.parse(localStorage.getItem('fiddy-preferences-v1')).volume`);
  if(savedVolume!==.4)throw new Error(`Volume did not persist: ${savedVolume}`);
  await record('initially muted');
  await click('button[aria-label="Enable cushion sounds"]');
  await waitFor(data=>data.state?.audio?.enabled && data.state.audio.contextState==='running','UI sound enable');
  await setVolume(100);
  await waitFor(data=>data.state?.audio?.volume===1,'Live volume update');
  await click('.volume-trigger');
  await record('enabled through trusted UI click');

  const points=[{id:10,x:159,y:423},{id:20,x:233,y:423}];
  await touch('touchStart',points);await moveHands(points);
  await record('two fingers moving');
  await waitFor(data=>data.state?.contactCount===2 && !data.state.audio.gestureActive && data.state.audio.transientVoices===0,'Stationary hands must fall quiet');
  await record('held still is quiet');
  await moveHands(points);await touch('touchEnd',[points[1]]);await moveHands([points[0]]);
  await record('one finger released, other still moving');
  await touch('touchEnd',[]);
  await waitFor(data=>data.state?.contactCount===0 && !data.state.audio.gestureActive && data.state.audio.transientVoices===0,'Release must finish all voices');
  await record('release finishes voices');

  await touch('touchStart',[{id:30,x:195,y:423}]);await moveHands([{id:30,x:195,y:423}]);
  await click('button[aria-label="Mute cushion sounds"]');await touch('touchEnd',[]);
  await waitFor(data=>data.state?.audio && !data.state.audio.enabled && !data.state.audio.gestureActive && data.state.audio.transientVoices===0,'Mute must clear audio');
  await record('mute while moving clears audio');
  for(let index=0;index<4;index++) {
    await click('button[aria-label$="cushion sounds"]');await delay(65);
  }
  await waitFor(data=>data.state?.audio && !data.state.audio.enabled && !data.state.audio.gestureActive,'Rapid toggles finish muted');
  await record('rapid toggles finish muted');

  await click('button[aria-label="Enable cushion sounds"]');
  await waitFor(data=>data.state?.audio?.enabled,'Re-enable before switching');
  const oldContexts=[...contexts].filter(([,state])=>state==='running').map(([id])=>id);
  if(oldContexts.length!==1)throw new Error(`Expected one shared context before switch: ${JSON.stringify([...contexts])}`);
  await click('button[aria-label="Open toy collection"]');await delay(150);
  await click('a[href*="toy=jelly"]');
  await waitFor(data=>data.state?.shape==='jelly' || data.state?.shape==='pebble' && data.state?.entrance>=0.95,'Toy switch readiness',25000);
  const restoredVolume=await evaluate(`document.querySelector('.volume-slider')?.value`);
  if(restoredVolume!=='100')throw new Error(`Volume did not follow toy switch: ${restoredVolume}`);
  await waitFor(()=>oldContexts.every(id=>['closed','destroyed'].includes(contexts.get(id))),'Old audio context must close');
  await record('toy switch closes old context');
  if(errors.length)throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(JSON.stringify({label:'passed',contextEvents}));
  await writeFile(join(artifacts,`audio-${backend}-results.json`),JSON.stringify({backend,results,contextEvents,errors},null,2));
} catch(error) {
  console.error(error);
  await writeFile(join(artifacts,`audio-${backend}-results.json`),JSON.stringify({backend,results,contextEvents,errors,failure:String(error)},null,2));
  process.exitCode=1;
} finally {
  if(socket?.readyState===WebSocket.OPEN) {
    try {await send('Browser.close',{},null);} catch {}
    socket.close();
  }
  await delay(400);if(chrome.exitCode===null)chrome.kill();
}
