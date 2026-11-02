import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const project = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const result = await build({ entryPoints: [project + 'src/lib/photo-queue.ts'], bundle: true, write: false,
  format: 'iife', globalName: 'queue', tsconfig: project + 'tsconfig.json',
  plugins: [{ name: 'test-services', setup(b) {
    b.onResolve({filter: /^@\/lib\/supabase\/client$/}, () => ({path:'supabase',namespace:'fixture'}));
    b.onResolve({filter: /^@\/app\/fonts$/}, () => ({path:'fonts',namespace:'fixture'}));
    b.onLoad({filter: /.*/, namespace:'fixture'}, ({path}) => ({ contents: path === 'fonts'
      ? 'export const hand={style:{fontFamily:"sans-serif"}},display=hand;'
      : `export function createClient(){return window.fakeSupabase}` }));
  }}] });
const server = createServer((req,res) => {
  res.setHeader('Content-Type','text/html'); res.end('<html><body>Photo recovery validation</body></html>');
});
await new Promise(r => server.listen(0,'127.0.0.1',r));
const browser = await chromium.launch({ executablePath, headless:true, args:['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({content:result.outputFiles[0].text});
  await page.evaluate(() => {
    window.state={owner:'owner-a',offline:true,rows:{},uploads:new Set(),writes:0,failAfterCommit:false};
    window.fakeSupabase={
      auth:{getSession:async()=>({data:{session:{user:{id:state.owner}}}})},
      from:()=>({select:()=>({eq:(_key,id)=>({maybeSingle:async()=>state.offline
        ? {data:null,error:{message:'Offline'}} : {data:state.rows[id]??null,error:null}})}),
        insert:async(row)=>{state.rows[row.id]=row; state.writes++; if(state.failAfterCommit) {state.failAfterCommit=false;return {error:{message:'Lost response'}};} return {error:null};}}),
      storage:{from:()=>({upload:async(path)=>{if(state.offline)return {error:{message:'Offline'}};
        if(state.uploads.has(path))return {error:{message:'The resource already exists',statusCode:'409'}};
        state.uploads.add(path);return {error:null};}})},
      rpc:async(name)=>name==='begin_roll_answer' && state.expired ? {error:{code:'P0001',message:'This call has closed.'}} : {data:'call-id',error:null}
    };
  });
  const id = await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=40;c.height=40;c.getContext('2d').fillRect(0,0,40,40);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg'));
    const photo=await queue.saveCapture(new File([blob],'original.jpg',{type:'image/jpeg'}),
      {eventId:'event',memberId:'member',frame:1,who:'Sam',today:'2026-11-02',mission:'Test',accent:'#f00'},
      {type:'photo',row:{day:'2026-11-02',kind:'night',mission:'Test'}});
    if(await queue.sendPending(photo))throw Error('Offline save incorrectly succeeded');
    return photo.id;
  });
  await page.reload();
  await page.addScriptTag({content:result.outputFiles[0].text});
  // Recreate mock service after reload; the original photo must still be in IndexedDB.
  await page.evaluate(()=>{
    window.state={owner:'owner-a',offline:false,rows:{},uploads:new Set(),writes:0,failAfterCommit:true};
    window.fakeSupabase={auth:{getSession:async()=>({data:{session:{user:{id:state.owner}}}})},
      from:()=>({select:()=>({eq:(_key,id)=>({maybeSingle:async()=>({data:state.rows[id]??null,error:null})})}),
        insert:async(row)=>{state.rows[row.id]=row;state.writes++;if(state.failAfterCommit){state.failAfterCommit=false;return {error:{message:'Lost response'}};}return {error:null};}}),
      storage:{from:()=>({upload:async(path)=>{if(state.uploads.has(path))return {error:{message:'The resource already exists',statusCode:'409'}};state.uploads.add(path);return {error:null};}})},
      rpc:async(name)=>name==='begin_roll_answer'&&state.expired ? {error:{code:'P0001',message:'This call has closed.'}}:{data:'call-id',error:null}};
  });
  const outcomes = await page.evaluate(async(id)=>{
    const [photo]=await queue.pendingPhotos('owner-a');
    if(photo.id!==id || photo.file.name!=='original.jpg' || !photo.file.size) throw Error('Photo did not survive reload');
    const lost=await queue.sendPending(photo);
    const recovered=await queue.sendPending((await queue.pendingPhotos('owner-a'))[0]);
    const after=await queue.pendingPhotos('owner-a');
    const reply={...photo,id:crypto.randomUUID(),action:{type:'answer',callId:'closed'}};
    state.expired=true;
    // Persist via saveCapture so the file and destination are committed first.
    const expired=await queue.saveCapture(reply.file,reply.options,reply.action);
    await queue.sendPending(expired);
    const [blocked]=await queue.pendingPhotos('owner-a');
    const call={...photo,action:{type:'call',recipients:null}};
    state.owner='owner-b';
    const crossAccount=await queue.sendPending(blocked);
    return {lost,recovered,count:after.length,writes:state.writes,blocked:blocked.blocked,bytes:blocked.file.size,
      retryCall:queue.autoRetry(call),retryBlocked:queue.autoRetry(blocked),crossAccount};
  },id);
  assert.equal(outcomes.lost,false); assert.equal(outcomes.recovered,true); assert.equal(outcomes.count,0);
  assert.equal(outcomes.writes,1); assert.equal(outcomes.blocked,true); assert.ok(outcomes.bytes>0);
  assert.equal(outcomes.retryCall,false); assert.equal(outcomes.retryBlocked,false); assert.equal(outcomes.crossAccount,false);
  console.log('Browser checks passed: offline retention, reload recovery, real image processing, lost-response reconciliation, no duplicate writes, expired-photo retention, account isolation, manual-only call retries.');
} finally { await browser.close(); server.close(); }
