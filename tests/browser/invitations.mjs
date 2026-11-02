import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const project = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const out=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client';
import {JoinForm} from './src/app/join/[code]/join-form';
window.React=React;window.mount=(props)=>{window.root?.unmount();const el=document.createElement('div');document.body.append(el);window.root=createRoot(el);window.root.render(React.createElement(JoinForm,props));};`,
resolveDir:project,sourcefile:'invite-smoke.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',
tsconfig:project + 'tsconfig.json',plugins:[{name:'fixtures',setup(b){
b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));
b.onResolve({filter:/^@\/lib\/supabase\/client$/},()=>({path:'supabase',namespace:'fixture'}));
b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='navigation'?`export function useRouter(){return {replace:(url)=>window.destination=url,refresh:()=>{}}}`:path==='link'?`export default function Link(props){return window.React.createElement('a',props)}`:`export function createClient(){return window.fakeSupabase}`}));
}}]});
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><body></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto(`http://127.0.0.1:${server.address().port}`);
await page.addScriptTag({content:out.outputFiles[0].text});
await page.evaluate(()=>{
window.fakeSupabase={auth:{signInAnonymously:async()=>({error:null})},rpc:async(name,args)=>{window.joined={name,args};return {data:args.p_event_id??'group',error:null}}};
window.mount({code:'invite-code',eventId:'event-id',signedIn:false,openNames:[]});
});
const emailLink=await page.getByRole('link',{name:'Sign in with email'}).getAttribute('href');
assert.equal(new URL('http://x'+emailLink).searchParams.get('next'),'/join/invite-code?event=event-id');
await page.getByRole('button',{name:'Continue without email'}).click();
await page.getByLabel('Your name').fill('Sam');
await page.getByRole('button',{name:'Join event',exact:true}).click();
await page.waitForFunction(()=>window.destination);
const first=await page.evaluate(()=>({joined:window.joined,destination:window.destination}));
assert.equal(first.joined.name,'join_event_invite');
assert.equal(first.joined.args.p_event_id,'event-id');
assert.equal(new URL('http://x'+first.destination).searchParams.get('next'),'/events/event-id');
await page.evaluate(()=>{window.destination=null;window.mount({code:'invite-code',eventId:'event-id',signedIn:true,alreadyInGroup:true,openNames:[]});});
await page.getByRole('button',{name:'Join event',exact:true}).click();
await page.waitForFunction(()=>window.destination);
assert.equal(await page.getByLabel('Your name').count(),0);
console.log('Browser invitation checks passed: event destination survives email sign-in links, guest joining reaches the event via alert setup, existing group members join without re-entering a name.');
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();server.close();}
