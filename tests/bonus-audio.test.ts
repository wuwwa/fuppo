import test from 'node:test';
import assert from 'node:assert/strict';
import { BonusChimes } from '../src/free-jelly/bonus-audio';

test('bonus chimes require sound consent and mute/disposal stop scheduled voices', async () => {
  let created=0,closed=0,started=0,stopped=0;
  const peaks:number[]=[],gains:{value:number}[]=[];
  const ctx=Object.assign(new EventTarget(),{state:'running',currentTime:1,resume:async()=>{},close:async()=>{closed++;},destination:{},
    createOscillator:()=>{const node={frequency:{value:0},type:'sine',onended:null as null|(()=>void),connect(){},disconnect(){},
      start(){started++;},stop(){stopped++;node.onended?.();}};return node;},
    createGain:()=>{const gain={value:0,setValueAtTime(){},linearRampToValueAtTime(value:number){peaks.push(value);},exponentialRampToValueAtTime(){}};gains.push(gain);
      return {gain,connect(){},disconnect(){}};}});
  const audio=new BonusChimes(()=>{created++;return ctx as unknown as AudioContext;});
  audio.setVolume(.6);
  audio.play('awaken');assert.equal(created,0);assert.equal(started,0);
  await audio.setEnabled(true);audio.play('awaken');audio.play('goodnight');
  assert.equal(created,1);assert.equal(started,6);assert.ok(peaks.every(p=>p<=0.05));assert.equal(gains[0].value,.6);
  audio.setVolume(2);assert.equal(gains[0].value,1);
  await audio.setEnabled(false);const before=started;audio.play('awaken');assert.equal(started,before);
  assert.ok(stopped>=started);audio.dispose();assert.equal(closed,1);
  await audio.setEnabled(true);audio.play('awaken');assert.equal(started,before);assert.equal(created,1);
});
