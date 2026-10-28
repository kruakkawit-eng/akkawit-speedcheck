'use strict';
const $ = id => document.getElementById(id);
let controller = null, running = false, generation = 0;
const fmt = n => Number.isFinite(n) ? n.toFixed(1) : '—';
const now = () => performance.now();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const median = a => { const s=[...a].sort((x,y)=>x-y); return (s[(s.length-1)>>1]+s[s.length>>1])/2; };
const mbps = (bytes, ms) => bytes * 8 / Math.max(ms,1) / 1000;
function check(signal){if(signal.aborted) throw new DOMException('Cancelled','AbortError');}
async function pingTest(signal){
  const samples=[];
  for(let i=0;i<12;i++){
    check(signal); const t=now();
    const r=await fetch('/api/ping?t='+Math.random(),{signal,cache:'no-store'});
    if(!r.ok) throw Error('Ping request failed');
    samples.push(now()-t); $('progress').value=(i+1)/12*15;
  }
  const changes=samples.slice(1).map((v,i)=>Math.abs(v-samples[i]));
  return {ping:median(samples), jitter:changes.reduce((a,b)=>a+b,0)/changes.length};
}
async function downloadTest(signal, token){
  const duration=8000, workers=4, bytesPerRequest=8*1024*1024;
  let bytes=0, finished=false; const started=now();
  const deadline=started+duration;
  const task=async()=>{
    while(!finished && now()<deadline){
      check(signal);
      const r=await fetch(`/api/download?bytes=${bytesPerRequest}&t=${Math.random()}`,{signal,cache:'no-store'});
      if(!r.ok || !r.body) throw Error('Download failed');
      const reader=r.body.getReader();
      try {while(true){check(signal);const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
        if(now()>=deadline){await reader.cancel();break;}
      }} finally {reader.releaseLock();}
    }
  };
  const ticker=setInterval(()=>{if(token!==generation)return;const elapsed=now()-started;$('current').textContent=fmt(mbps(bytes,elapsed));$('progress').value=15+Math.min(40,elapsed/duration*40);},150);
  try {await Promise.all(Array.from({length:workers},task));} finally {finished=true;clearInterval(ticker);}
  const elapsed=Math.min(now()-started,duration);
  if(bytes===0)throw Error('No download data received');
  $('progress').value=55;
  return mbps(bytes,elapsed);
}
async function uploadTest(signal, token){
  const duration=8000, workers=4, payloadSize=1024*1024;
  const payload=new Uint8Array(payloadSize);
  // Fill the complete buffer to reduce compression effects.
  for(let i=0;i<payload.length;i+=65536)crypto.getRandomValues(payload.subarray(i,Math.min(i+65536,payload.length)));
  let bytes=0;const started=now(),deadline=started+duration;
  const task=async()=>{
    while(now()<deadline){
      check(signal);
      const r=await fetch('/api/upload?t='+Math.random(),{method:'POST',body:payload,signal,cache:'no-store'});
      if(!r.ok)throw Error('Upload failed');
      const data=await r.json();
      if(data.received!==payloadSize)throw Error('Upload byte count mismatch');
      bytes+=payloadSize;
    }
  };
  const ticker=setInterval(()=>{if(token!==generation)return;const elapsed=now()-started;$('current').textContent=fmt(mbps(bytes,elapsed));$('progress').value=55+Math.min(44,elapsed/duration*44);},150);
  try {await Promise.all(Array.from({length:workers},task));}finally{clearInterval(ticker);}
  if(bytes===0)throw Error('No upload completed');
  $('progress').value=99;
  return mbps(bytes,now()-started);
}
async function run(){
  if(running)return;running=true;const token=++generation;controller=new AbortController();const signal=controller.signal;
  $('start').disabled=true;$('reset').disabled=true;$('cancel').hidden=false;$('progress').value=0;
  for(const id of ['download','upload','ping','jitter','current'])$(id).textContent='—';
  try{
    $('stage').textContent='MEASURING LATENCY';$('message').textContent='กำลังวัด Ping และ Jitter';
    const latency=await pingTest(signal);check(signal);
    $('ping').textContent=fmt(latency.ping);$('jitter').textContent=fmt(latency.jitter);
    $('stage').textContent='DOWNLOAD TEST';$('message').textContent='กำลังดาวน์โหลดพร้อมกัน 4 ช่องทาง';
    const down=await downloadTest(signal,token);check(signal);$('download').textContent=fmt(down);
    $('stage').textContent='UPLOAD TEST';$('message').textContent='กำลังอัปโหลดพร้อมกัน 4 ช่องทาง';$('current').textContent='—';
    const up=await uploadTest(signal,token);check(signal);$('upload').textContent=fmt(up);
    $('current').textContent=fmt(down);$('stage').textContent='TEST COMPLETE';$('message').textContent='ทดสอบเสร็จเรียบร้อย';$('progress').value=100;
  }catch(e){if(token===generation){$('stage').textContent=e.name==='AbortError'?'TEST CANCELLED':'TEST FAILED';$('message').textContent=e.name==='AbortError'?'ยกเลิกการทดสอบแล้ว':'ไม่สามารถทดสอบได้: '+e.message;}}
  finally{running=false;$('start').disabled=false;$('reset').disabled=false;$('cancel').hidden=true;controller=null;}
}
function reset(){generation++;controller?.abort();for(const id of ['download','upload','ping','jitter','current'])$(id).textContent='—';$('stage').textContent='READY FOR SPEED TEST';$('message').textContent='พร้อมทดสอบความเร็วอินเทอร์เน็ต';$('progress').value=0;}
$('start').addEventListener('click',run);$('cancel').addEventListener('click',()=>controller?.abort());$('reset').addEventListener('click',reset);
